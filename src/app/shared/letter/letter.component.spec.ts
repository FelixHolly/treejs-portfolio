import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CORRESPONDENCE } from "../../core/content/correspondence.content";
import { EmailService } from "../../services/email.service";
import { NotificationService } from "../../services/notification.service";
import { LetterComponent } from "./letter.component";

describe("LetterComponent", () => {
  let fixture: ComponentFixture<LetterComponent>;
  let component: LetterComponent;
  let element: HTMLElement;
  let email: jasmine.SpyObj<EmailService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const VALID = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello" };

  beforeEach(() => {
    email = jasmine.createSpyObj<EmailService>("EmailService", ["sendContactEmail"]);
    notifications = jasmine.createSpyObj<NotificationService>("NotificationService", ["showSuccess", "showError"]);

    TestBed.configureTestingModule({
      providers: [
        { provide: EmailService, useValue: email },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    fixture = TestBed.createComponent(LetterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  function errors(): string[] {
    return Array.from(element.querySelectorAll("[id$='-error']")).map((node) => node.textContent!.trim());
  }

  it("shows no errors before the visitor has touched anything", () => {
    expect(errors()).toEqual([]);
  });

  it("refuses an empty letter: three errors, nothing sent, focus on the first field", async () => {
    await component.send();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(errors()).toEqual(["Full name is required", "Enter a valid email address", "Message is required"]);
    expect(email.sendContactEmail).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("letter-name");
  });

  it("ties each error to its field for assistive technology", async () => {
    await component.send();
    fixture.detectChanges();

    const field = element.querySelector<HTMLInputElement>("#letter-email")!;
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(field.getAttribute("aria-describedby")).toBe("letter-email-error");
  });

  for (const bad of ["plain", "a@", "@b.co", "a b@c.de"]) {
    it(`rejects the malformed address "${bad}"`, async () => {
      component.form.setValue({ ...VALID, email: bad });

      await component.send();
      fixture.detectChanges();

      expect(errors()).toEqual(["Enter a valid email address"]);
      expect(email.sendContactEmail).not.toHaveBeenCalled();
    });
  }

  it("sends a valid letter, thanks the visitor and clears the form", async () => {
    email.sendContactEmail.and.resolveTo();
    component.form.setValue(VALID);

    await component.send();
    fixture.detectChanges();

    expect(email.sendContactEmail).toHaveBeenCalledOnceWith(VALID);
    expect(notifications.showSuccess).toHaveBeenCalledTimes(1);
    expect(component.form.getRawValue()).toEqual({ name: "", email: "", message: "" });
    expect(errors()).toEqual([]);
    expect(component.loading()).toBeFalse();
  });

  it("keeps what the visitor typed when the mail service fails", async () => {
    email.sendContactEmail.and.rejectWith(new Error("network"));
    component.form.setValue(VALID);

    await component.send();
    fixture.detectChanges();

    expect(notifications.showError).toHaveBeenCalledTimes(1);
    expect(component.form.getRawValue()).toEqual(VALID);
    expect(component.loading()).toBeFalse();
  });

  it("disables the button while a letter is on its way", () => {
    component.loading.set(true);
    fixture.detectChanges();

    const button = element.querySelector<HTMLButtonElement>("button[type=submit]")!;
    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain("Sending");
  });

  it("offers LinkedIn and GitHub, no CV until one exists, and never an email address", () => {
    const labels = Array.from(element.querySelectorAll(".desk-links a")).map((link) => link.textContent!.trim());

    expect(labels.some((label) => label.startsWith("LinkedIn"))).toBeTrue();
    expect(labels.some((label) => label.startsWith("GitHub"))).toBeTrue();
    expect(CORRESPONDENCE.cvHref).toBeNull();
    expect(labels.some((label) => label.includes("CV"))).toBeFalse();
    expect(element.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(element.textContent).not.toMatch(/[\w.]+@[\w-]+\.\w+/);
  });
});
