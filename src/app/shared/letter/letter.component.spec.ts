import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CORRESPONDENCE } from "../../core/content/correspondence.content";
import { EmailService } from "../../services/email.service";
import { LetterComponent } from "./letter.component";

describe("LetterComponent", () => {
  let fixture: ComponentFixture<LetterComponent>;
  let component: LetterComponent;
  let element: HTMLElement;
  let email: jasmine.SpyObj<EmailService>;
  let posted: jasmine.Spy;

  const VALID = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello" };

  beforeEach(() => {
    email = jasmine.createSpyObj<EmailService>("EmailService", ["sendContactEmail"]);
    posted = jasmine.createSpy("posted");

    TestBed.configureTestingModule({ providers: [{ provide: EmailService, useValue: email }] });
    fixture = TestBed.createComponent(LetterComponent);
    component = fixture.componentInstance;
    component.posted.subscribe(posted);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  function errors(): string[] {
    return Array.from(element.querySelectorAll("[id$='-error']")).map((node) => node.textContent!.trim());
  }

  function button(label: string): HTMLButtonElement {
    const found = Array.from(element.querySelectorAll("button")).find((candidate) => candidate.textContent!.includes(label));
    if (!found) throw new Error(`no button labelled "${label}"`);
    return found;
  }

  function message(): HTMLTextAreaElement {
    return element.querySelector<HTMLTextAreaElement>("#letter-message")!;
  }

  async function send(): Promise<void> {
    await component.send();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  describe("as a letter", () => {
    it("opens with the salutation as the message's label, and the signature after it", () => {
      const label = element.querySelector('label[for="letter-message"]')!;
      const order = Array.from(element.querySelectorAll("[formControlName]")).map((field) => field.id);

      expect(label.textContent).toContain("Dear Felix,");
      expect(label.textContent).toContain("your message");
      expect(order).toEqual(["letter-message", "letter-name", "letter-email"]);
    });

    it("carries a stamp that assistive technology skips", () => {
      const stamp = element.querySelector(".stamp")!;

      expect(stamp.getAttribute("aria-hidden")).toBe("true");
      expect(stamp.querySelector("img")?.getAttribute("alt")).toBe("");
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

  describe("starters", () => {
    it("offers one chip for each way into the letter, named as a group", () => {
      const group = element.querySelector(".starters")!;
      const chips = Array.from(group.querySelectorAll("button")).map((chip) => chip.textContent!.trim());

      expect(group.getAttribute("role")).toBe("group");
      expect(element.querySelector(`#${group.getAttribute("aria-labelledby")}`)?.textContent).toContain("Start with");
      expect(chips).toEqual(CORRESPONDENCE.starters.map((starter) => starter.label));
      expect(Array.from(group.querySelectorAll("button")).every((chip) => chip.type === "button")).toBeTrue();
    });

    it("writes the letter's first words and leaves the caret after them", () => {
      const [role] = CORRESPONDENCE.starters;

      button(role.label).click();
      fixture.detectChanges();

      expect(component.form.controls.message.value).toBe(role.opening);
      expect(document.activeElement).toBe(message());
      expect(message().selectionStart).toBe(role.opening.length);
      expect(email.sendContactEmail).not.toHaveBeenCalled();
    });

    it("swaps one starter for another", () => {
      const [role, project] = CORRESPONDENCE.starters;

      button(role.label).click();
      button(project.label).click();

      expect(component.form.controls.message.value).toBe(project.opening);
    });

    it("never overwrites what the visitor has written themselves, but still takes them to the message", () => {
      component.form.controls.message.setValue("My own first line");

      button(CORRESPONDENCE.starters[0].label).click();

      expect(component.form.controls.message.value).toBe("My own first line");
      expect(document.activeElement).toBe(message());
    });

    it("treats a message of only spaces as unwritten", () => {
      component.form.controls.message.setValue("   ");

      button(CORRESPONDENCE.starters[2].label).click();

      expect(component.form.controls.message.value).toBe(CORRESPONDENCE.starters[2].opening);
    });
  });

  describe("checking the letter", () => {
    it("shows no errors before the visitor has touched anything", () => {
      expect(errors()).toEqual([]);
      expect(element.querySelector('[role="alert"]')).toBeNull();
    });

    it("refuses an empty letter: three errors in reading order, nothing sent, focus on the message", async () => {
      await send();

      expect(errors()).toEqual(["Write a line or two first", "Sign with your name", "Enter a valid email address"]);
      expect(email.sendContactEmail).not.toHaveBeenCalled();
      expect(posted).not.toHaveBeenCalled();
      expect(document.activeElement?.id).toBe("letter-message");
    });

    it("moves focus to the first field that is still wrong", async () => {
      component.form.setValue({ ...VALID, name: "" });

      await send();

      expect(errors()).toEqual(["Sign with your name"]);
      expect(document.activeElement?.id).toBe("letter-name");
    });

    it("ties each error to its field for assistive technology", async () => {
      await send();

      for (const id of ["letter-message", "letter-name", "letter-email"]) {
        const field = element.querySelector<HTMLElement>(`#${id}`)!;
        expect(field.getAttribute("aria-invalid")).withContext(id).toBe("true");
        expect(element.querySelector(`#${field.getAttribute("aria-describedby")}`)).withContext(id).not.toBeNull();
      }
    });

    it("marks nothing invalid on a letter that is in order", () => {
      component.form.setValue(VALID);
      fixture.detectChanges();

      expect(message().getAttribute("aria-invalid")).toBe("false");
      expect(message().hasAttribute("aria-describedby")).toBeFalse();
    });

    for (const bad of ["plain", "a@", "@b.co", "a b@c.de"]) {
      it(`rejects the malformed address "${bad}"`, async () => {
        component.form.setValue({ ...VALID, email: bad });

        await send();

        expect(errors()).toEqual(["Enter a valid email address"]);
        expect(email.sendContactEmail).not.toHaveBeenCalled();
      });
    }
  });

  describe("sending", () => {
    it("sends a valid letter, then says where the answer will go in place of the form", async () => {
      email.sendContactEmail.and.resolveTo();
      component.form.setValue(VALID);

      await send();

      const sealed = element.querySelector<HTMLElement>(".sealed")!;
      expect(email.sendContactEmail).toHaveBeenCalledOnceWith(VALID);
      expect(posted).toHaveBeenCalledTimes(1);
      expect(element.querySelector("form")).toBeNull();
      expect(sealed.getAttribute("role")).toBe("status");
      expect(sealed.textContent).toContain("Your letter is on its way.");
      expect(sealed.textContent).toContain("I will write back to ada@example.com.");
      expect(document.activeElement).toBe(sealed);
      expect(component.loading()).toBeFalse();
    });

    it("keeps the links to LinkedIn and GitHub beside the confirmation", async () => {
      email.sendContactEmail.and.resolveTo();
      component.form.setValue(VALID);

      await send();

      expect(element.querySelectorAll(".desk-links a").length).toBe(CORRESPONDENCE.links.length);
    });

    it("starts a fresh letter from the confirmation, with focus on the message", async () => {
      email.sendContactEmail.and.resolveTo();
      component.form.setValue(VALID);
      await send();

      button("Write another letter").click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element.querySelector(".sealed")).toBeNull();
      expect(component.form.getRawValue()).toEqual({ name: "", email: "", message: "" });
      expect(errors()).toEqual([]);
      expect(document.activeElement).toBe(message());
    });

    it("keeps what the visitor wrote when the mail service fails, and says so inside the letter", async () => {
      email.sendContactEmail.and.rejectWith(new Error("network"));
      component.form.setValue(VALID);

      await send();

      const alert = element.querySelector('[role="alert"]')!;
      expect(alert.textContent).toContain("The letter did not go out.");
      expect(alert.compareDocumentPosition(button("Send the letter")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(component.form.getRawValue()).toEqual(VALID);
      expect(element.querySelector(".sealed")).toBeNull();
      expect(posted).not.toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });

    it("drops the failure message once a later attempt goes through", async () => {
      email.sendContactEmail.and.rejectWith(new Error("network"));
      component.form.setValue(VALID);
      await send();

      email.sendContactEmail.and.resolveTo();
      await send();

      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(element.querySelector(".sealed")).not.toBeNull();
      expect(email.sendContactEmail).toHaveBeenCalledTimes(2);
    });

    it("disables the button while a letter is on its way", () => {
      component.loading.set(true);
      fixture.detectChanges();

      const submit = element.querySelector<HTMLButtonElement>("button[type=submit]")!;
      expect(submit.disabled).toBeTrue();
      expect(submit.textContent).toContain("Sending");
    });
  });
});
