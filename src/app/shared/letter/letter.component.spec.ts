import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CORRESPONDENCE } from "../../core/content/correspondence.content";
import { EmailService } from "../../core/email/email.service";
import { LetterComponent } from "./letter.component";

describe("LetterComponent", () => {
  let fixture: ComponentFixture<LetterComponent>;
  let component: LetterComponent;
  let element: HTMLElement;
  let email: jasmine.SpyObj<EmailService>;
  let posted: jasmine.Spy;

  const VALID = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello" };
  const FIELDS = ["letter-message", "letter-name", "letter-email"];

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

  function text(node: Element | null | undefined): string {
    return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function sheet(): HTMLElement {
    return element.querySelector<HTMLElement>(".sheet")!;
  }

  function sendButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>("form button[type=submit]")!;
  }

  function message(): HTMLTextAreaElement {
    return element.querySelector<HTMLTextAreaElement>("#letter-message")!;
  }

  function follows(earlier: Node, later: Node): boolean {
    return !!(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  async function send(): Promise<void> {
    await component.send();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function sendValid(): Promise<void> {
    email.sendContactEmail.and.resolveTo();
    component.form.setValue(VALID);
    await send();
  }

  describe("as a plain typed letter", () => {
    it("stands under the section's first and only heading, which is not on the paper", () => {
      const headings = element.querySelectorAll("h1, h2, h3, h4");

      expect(headings.length).toBe(1);
      expect(headings[0].tagName).toBe("H2");
      expect(text(headings[0])).toBe("Write to me");
      expect(element.firstElementChild).toBe(headings[0]);
      expect(sheet().contains(headings[0])).toBeFalse();
    });

    it("is dated today, as a letter-writer puts it", () => {
      const today = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());

      expect(text(sheet().querySelector(".date"))).toBe(today);
    });

    it("opens with the salutation as the message's label, and closes with the signing lines", () => {
      const label = element.querySelector('label[for="letter-message"]')!;
      const order = Array.from(element.querySelectorAll("[formControlName]")).map((field) => field.id);

      expect(label.textContent).toContain("Dear Felix,");
      expect(label.textContent).toContain("your message");
      expect(order).toEqual(FIELDS);
      expect(text(sheet().querySelector(".closing p"))).toBe("Kind regards,");
    });

    it("leaves the invitation where the message will be written", () => {
      expect(message().placeholder).toBe("Hiring for a role, or want to talk a project through? A few lines are enough.");
      expect(message().placeholder).toBe(CORRESPONDENCE.invitation);
    });

    it("prints each signing line's caption under the line it names", () => {
      for (const [id, words, autocomplete] of [
        ["letter-name", "Your name", "name"],
        ["letter-email", "Your email, so I can reply", "email"],
      ]) {
        const field = element.querySelector<HTMLInputElement>(`#${id}`)!;
        const label = element.querySelector(`label[for="${id}"]`)!;

        expect(text(label)).withContext(id).toBe(words);
        expect(follows(field, label)).withContext(id).toBeTrue();
        expect(field.autocomplete).withContext(id).toBe(autocomplete);
      }
      expect(element.querySelector<HTMLInputElement>("#letter-email")!.type).toBe("email");
    });

    it("has nothing on the paper but the letter itself", () => {
      expect(sheet().querySelector("img, svg, button, a, h2, [type=radio]")).toBeNull();
      expect(sheet().querySelectorAll("input, textarea").length).toBe(3);
      expect(text(sheet())).not.toMatch(/Re:|P\.S\.|circle/);
      expect(text(sheet())).not.toContain(CORRESPONDENCE.room);
    });

    it("keeps the stamp for the envelope", () => {
      expect(element.querySelector(".stamp")).toBeNull();
      expect(element.querySelector("app-letter-envelope")).toBeNull();
    });

    it("names the other ways to reach the owner under the sheet: the CV to download, the profiles, and never an email address", () => {
      const elsewhere = element.querySelector("app-letter-elsewhere")!;
      const [cv, ...links] = Array.from(elsewhere.querySelectorAll("a"));

      expect(text(elsewhere)).toBe("Or download my CV, or find me on LinkedIn (opens in a new tab) or GitHub (opens in a new tab).");
      expect(follows(sheet(), elsewhere)).toBeTrue();
      expect(sheet().contains(elsewhere)).toBeFalse();
      expect(cv.getAttribute("href")).toBe("assets/felix-hollndonner-resume.pdf");
      expect(cv.hasAttribute("download")).toBeTrue();
      expect(links.map((link) => link.getAttribute("href"))).toEqual(CORRESPONDENCE.links.map((link) => link.href));
      expect(links.every((link) => link.target === "_blank" && link.rel === "noopener noreferrer")).toBeTrue();
      expect(element.querySelector('a[href^="mailto:"]')).toBeNull();
      expect(element.textContent).not.toMatch(/[\w.]+@[\w-]+\.\w+/);
    });
  });

  describe("checking the letter", () => {
    it("shows no errors before the visitor has touched anything", () => {
      expect(errors()).toEqual([]);
      expect(element.querySelector('[role="alert"]')).toBeNull();
    });

    it("refuses an empty letter: three errors in reading order, nothing sent, focus on the message", async () => {
      await send();

      expect(errors()).toEqual(["Write a line or two first", "Add your name", "Enter a valid email address"]);
      expect(email.sendContactEmail).not.toHaveBeenCalled();
      expect(posted).not.toHaveBeenCalled();
      expect(document.activeElement?.id).toBe("letter-message");
    });

    it("moves focus to the first field that is still wrong", async () => {
      component.form.setValue({ ...VALID, name: "" });

      await send();

      expect(errors()).toEqual(["Add your name"]);
      expect(document.activeElement?.id).toBe("letter-name");
    });

    it("shows a field's error once the visitor has left it empty, before any attempt to send", () => {
      const name = element.querySelector<HTMLInputElement>("#letter-name")!;

      name.dispatchEvent(new Event("blur"));
      fixture.detectChanges();

      expect(errors()).toEqual(["Add your name"]);
    });

    it("ties each error to its field for assistive technology, and writes it after the field", async () => {
      await send();

      for (const id of FIELDS) {
        const field = element.querySelector<HTMLElement>(`#${id}`)!;
        const error = element.querySelector(`#${field.getAttribute("aria-describedby")}`)!;

        expect(field.getAttribute("aria-invalid")).withContext(id).toBe("true");
        expect(error).withContext(id).not.toBeNull();
        expect(follows(field, error)).withContext(id).toBeTrue();
      }
    });

    it("writes a signing line's error under its rule and leaves the caption below it", async () => {
      await send();

      for (const id of ["letter-name", "letter-email"]) {
        const field = element.querySelector<HTMLElement>(`#${id}`)!;
        const label = element.querySelector(`label[for="${id}"]`)!;

        expect(field.nextElementSibling?.id).withContext(id).toBe(`${id}-error`);
        expect(field.nextElementSibling?.nextElementSibling).withContext(id).toBe(label);
      }
    });

    it("marks nothing invalid on a letter that is in order", () => {
      component.form.setValue(VALID);
      fixture.detectChanges();

      for (const id of FIELDS) {
        const field = element.querySelector<HTMLElement>(`#${id}`)!;
        expect(field.getAttribute("aria-invalid")).withContext(id).toBe("false");
        expect(field.hasAttribute("aria-describedby")).withContext(id).toBeFalse();
      }
    });

    for (const blank of ["", "   ", "\n\t "]) {
      it(`does not take ${JSON.stringify(blank)} for a message`, async () => {
        component.form.setValue({ ...VALID, message: blank });

        await send();

        expect(errors()).toEqual(["Write a line or two first"]);
        expect(email.sendContactEmail).not.toHaveBeenCalled();
      });
    }

    for (const written of ["Hi", "I'm hiring for ", "  a line with space around it  "]) {
      it(`takes ${JSON.stringify(written)} for a message, as any text is one`, async () => {
        email.sendContactEmail.and.resolveTo();
        component.form.setValue({ ...VALID, message: written });

        await send();

        expect(email.sendContactEmail).toHaveBeenCalledOnceWith({ ...VALID, message: written });
      });
    }

    for (const bad of ["plain", "a@", "@b.co", "a b@c.de"]) {
      it(`rejects the malformed address "${bad}"`, async () => {
        component.form.setValue({ ...VALID, email: bad });

        await send();

        expect(errors()).toEqual(["Enter a valid email address"]);
        expect(email.sendContactEmail).not.toHaveBeenCalled();
      });
    }
  });

  describe("the send button", () => {
    it("is the site's gold button, under the sheet and not on it, named by its own words", () => {
      const button = sendButton();

      expect(text(button)).toBe("Send the letter");
      expect(button.classList.contains("plaque")).toBeTrue();
      expect(button.hasAttribute("aria-label")).toBeFalse();
      expect(button.querySelector("svg, img")).toBeNull();
      expect(button.disabled).toBeFalse();
      expect(sheet().contains(button)).toBeFalse();
      expect(follows(sheet(), button)).toBeTrue();
      expect(element.querySelectorAll("button").length).toBe(1);
    });

    it("is the next stop for the Tab key after the signing lines, ahead of the links", () => {
      const stops = Array.from(element.querySelectorAll<HTMLElement>("textarea, input, button, a")).map((stop) => stop.id || stop.tagName);

      expect(stops).toEqual(["letter-message", "letter-name", "letter-email", "BUTTON", "A", "A", "A"]);
      expect(element.querySelector("[tabindex]")).toBeNull();
    });

    it("sends the letter when the form is submitted, as Enter in a signing line does", () => {
      const sent = spyOn(component, "send");

      element.querySelector("form")!.dispatchEvent(new Event("submit"));

      expect(sent).toHaveBeenCalledTimes(1);
    });

    it("cannot be pressed twice while a letter is on its way", () => {
      component.loading.set(true);
      fixture.detectChanges();

      expect(sendButton().disabled).toBeTrue();
      expect(text(sendButton())).toBe("Sending");
    });
  });

  describe("sending", () => {
    it("hands the mail service the name, the address and the message exactly as written", async () => {
      await sendValid();

      expect(email.sendContactEmail).toHaveBeenCalledOnceWith(VALID);
      expect(Object.keys(email.sendContactEmail.calls.mostRecent().args[0]).sort()).toEqual(["email", "message", "name"]);
    });

    it("emits posted once, then says where the answer will go in place of the sheet", async () => {
      await sendValid();

      const status = element.querySelector<HTMLElement>('[role="status"]')!;
      expect(posted).toHaveBeenCalledTimes(1);
      expect(element.querySelector("form")).toBeNull();
      expect(sheet()).toBeNull();
      expect(text(element.querySelector(`#${status.getAttribute("aria-labelledby")}`))).toBe("Your letter is on its way.");
      expect(status.textContent).toContain("I will write back to ada@example.com.");
      expect(document.activeElement).toBe(status);
      expect(component.loading()).toBeFalse();
    });

    it("brings the letter back into view, since the envelope is shorter than the sheet was", async () => {
      const scrolled = spyOn(element, "scrollIntoView");

      await sendValid();

      expect(scrolled).toHaveBeenCalledOnceWith({ block: "nearest" });
    });

    it("shows the front of an envelope: addressed, stamped and postmarked, with nothing to press", async () => {
      await sendValid();

      const envelope = element.querySelector("app-letter-envelope")!;
      const stamp = envelope.querySelector(".stamp")!;
      expect(text(envelope.querySelector(".address"))).toBe("An envelope addressed to Felix Hollndonner, Room IV, Correspondence");
      expect(stamp.getAttribute("aria-hidden")).toBe("true");
      expect(stamp.querySelector("img")?.getAttribute("alt")).toBe("");
      expect(text(stamp)).toBe("");
      expect(envelope.querySelector("svg.postmark")?.getAttribute("aria-hidden")).toBe("true");
      expect(envelope.querySelectorAll("svg").length).toBe(1);
      expect(envelope.querySelector("a, button, input")).toBeNull();
      expect(follows(envelope, element.querySelector('[role="status"]')!)).toBeTrue();
    });

    it("keeps the same heading above the envelope, and the other ways to reach the owner below it", async () => {
      const heading = element.querySelector("h2");

      await sendValid();

      expect(element.querySelector("h2")).toBe(heading);
      expect(element.querySelectorAll("h1, h2, h3, h4").length).toBe(1);
      expect(element.querySelectorAll("app-letter-elsewhere a").length).toBe(CORRESPONDENCE.links.length + 1);
      expect(element.textContent!.replace("ada@example.com", "")).not.toMatch(/[\w.]+@[\w-]+\.\w+/);
    });

    it("starts a fresh letter from the confirmation, with focus on the message", async () => {
      await sendValid();
      const again = element.querySelector<HTMLButtonElement>("button")!;
      expect(text(again)).toBe("Write another letter");
      expect(again.type).toBe("button");

      again.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element.querySelector('[role="status"]')).toBeNull();
      expect(element.querySelector("app-letter-envelope")).toBeNull();
      expect(component.form.getRawValue()).toEqual({ name: "", email: "", message: "" });
      expect(errors()).toEqual([]);
      expect(document.activeElement).toBe(message());
    });

    it("keeps what the visitor wrote when the mail service fails, and says so between the sheet and the button", async () => {
      email.sendContactEmail.and.rejectWith(new Error("network"));
      component.form.setValue(VALID);

      await send();

      const alert = element.querySelector('form [role="alert"]')!;
      expect(text(alert)).toBe("The letter did not go out. What you wrote is still here: try again in a moment, or use the links below.");
      expect(alert.querySelector("svg, img")).toBeNull();
      expect(sheet().contains(alert)).toBeFalse();
      expect(follows(sheet(), alert)).toBeTrue();
      expect(follows(alert, sendButton())).toBeTrue();
      expect(follows(alert, element.querySelector("app-letter-elsewhere")!)).toBeTrue();
      expect(component.form.getRawValue()).toEqual(VALID);
      expect(message().value).toBe(VALID.message);
      expect(document.activeElement).toBe(sendButton());
      expect(element.querySelector('[role="status"]')).toBeNull();
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
      expect(element.querySelector('[role="status"]')).not.toBeNull();
      expect(email.sendContactEmail).toHaveBeenCalledTimes(2);
      expect(posted).toHaveBeenCalledTimes(1);
    });
  });
});
