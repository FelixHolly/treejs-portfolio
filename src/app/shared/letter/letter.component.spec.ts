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

  const WRITTEN = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello" };
  const VALID = { ...WRITTEN, topic: "" };
  const [ROLE, PROJECT, HELLO] = CORRESPONDENCE.topics;

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

  /** What is printed or written there: the seal's monogram is part of its drawing, not of the words. */
  function text(node: Element | null | undefined): string {
    const copy = node?.cloneNode(true) as Element | undefined;
    copy?.querySelectorAll("svg").forEach((drawing) => drawing.remove());
    return (copy?.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  function button(label: string): HTMLButtonElement {
    const found = Array.from(element.querySelectorAll("button")).find((candidate) => candidate.textContent!.includes(label));
    if (!found) throw new Error(`no button labelled "${label}"`);
    return found;
  }

  function message(): HTMLTextAreaElement {
    return element.querySelector<HTMLTextAreaElement>("#letter-message")!;
  }

  function radios(): HTMLInputElement[] {
    return Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  }

  function circle(word: string): HTMLElement {
    const label = Array.from(element.querySelectorAll("app-letter-topics label")).find((candidate) => text(candidate) === word)!;
    return label.querySelector<HTMLElement>("svg")!;
  }

  function choose(word: string): HTMLInputElement {
    const radio = radios().find((candidate) => text(candidate.closest("label")) === word)!;
    radio.focus();
    radio.click();
    fixture.detectChanges();
    return radio;
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

  describe("as a sheet of stationery", () => {
    it("is headed with a crest, the owner's name and room, and today's date as a letter-writer puts it", () => {
      const head = element.querySelector("app-letterhead")!;
      const today = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());

      expect(head.querySelector("img")?.getAttribute("alt")).toBe("");
      expect(text(head)).toContain("Felix Hollndonner");
      expect(text(head)).toContain("Room IV, Correspondence");
      expect(text(head.querySelector(".date"))).toBe(today);
    });

    it("invites the visitor under the section's first and only heading", () => {
      const headings = element.querySelectorAll("h1, h2, h3, h4");

      expect(headings.length).toBe(1);
      expect(headings[0].tagName).toBe("H2");
      expect(text(headings[0])).toBe("Write to me");
      expect(element.textContent).toContain(CORRESPONDENCE.intro);
    });

    it("opens with the salutation as the message's label, and the signature after it", () => {
      const label = element.querySelector('label[for="letter-message"]')!;
      const order = Array.from(element.querySelectorAll("[formControlName]")).map((field) => field.id);

      expect(label.textContent).toContain("Dear Felix,");
      expect(label.textContent).toContain("your message");
      expect(order).toEqual(["letter-message", "letter-name", "letter-email"]);
      expect(text(element.querySelector(".closing"))).toBe("Kind regards,");
    });

    it("prints each signing line's label under the line it names", () => {
      for (const [id, words, autocomplete] of [
        ["letter-name", "your name", "name"],
        ["letter-email", "your email, for my reply", "email"],
      ]) {
        const field = element.querySelector<HTMLInputElement>(`#${id}`)!;
        const label = element.querySelector(`label[for="${id}"]`)!;

        expect(text(label)).withContext(id).toBe(words);
        expect(field.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).withContext(id).toBeTruthy();
        expect(field.autocomplete).withContext(id).toBe(autocomplete);
      }
      expect(element.querySelector<HTMLInputElement>("#letter-email")!.type).toBe("email");
    });

    it("keeps the stamp for the envelope", () => {
      expect(element.querySelector(".stamp")).toBeNull();
    });

    it("adds LinkedIn and GitHub as a postscript, no CV until one exists, and never an email address", () => {
      const postscript = element.querySelector("app-letter-postscript")!;
      const links = Array.from(postscript.querySelectorAll("a"));

      expect(text(postscript)).toBe("P.S. You can also find me on LinkedIn (opens in a new tab) or GitHub (opens in a new tab).");
      expect(links.map((link) => link.getAttribute("href"))).toEqual(CORRESPONDENCE.links.map((link) => link.href));
      expect(links.every((link) => link.target === "_blank" && link.rel === "noopener noreferrer")).toBeTrue();
      expect(postscript.querySelector("svg")).toBeNull();
      expect(CORRESPONDENCE.cvHref).toBeNull();
      expect(text(postscript)).not.toContain("CV");
      expect(element.querySelector('a[href^="mailto:"]')).toBeNull();
      expect(element.textContent).not.toMatch(/[\w.]+@[\w-]+\.\w+/);
    });
  });

  describe("the Re: line", () => {
    it("offers the topics as one named group of radios, none chosen and none required", () => {
      const group = element.querySelector('[role="radiogroup"]')!;
      const name = element.querySelector(`#${group.getAttribute("aria-labelledby")}`)!;

      expect(text(name)).toContain("Re:");
      expect(text(name)).toContain("what your letter is about");
      expect(radios().map((radio) => text(radio.closest("label")))).toEqual(["a role", "a project", "just a hello"]);
      expect(radios().every((radio) => !radio.checked && !radio.required)).toBeTrue();
      expect(group.querySelector("button")).toBeNull();
    });

    it("shares one name between the radios, which is what lets the arrow keys move the choice", () => {
      expect(new Set(radios().map((radio) => radio.name)).size).toBe(1);
      expect(radios()[0].name).not.toBe("");
    });

    it("draws the pen's circle round the chosen topic and no other", () => {
      choose(PROJECT.word);

      expect(component.form.controls.topic.value).toBe(PROJECT.word);
      expect(getComputedStyle(circle(PROJECT.word)).opacity).toBe("1");
      expect(getComputedStyle(circle(ROLE.word)).opacity).toBe("0");
      expect(getComputedStyle(circle(HELLO.word)).opacity).toBe("0");
      expect(circle(PROJECT.word).getAttribute("aria-hidden")).toBe("true");
    });

    it("writes the letter's first words and leaves focus on the radio", () => {
      const radio = choose(ROLE.word);

      expect(component.form.controls.message.value).toBe(ROLE.opening);
      expect(message().value).toBe(ROLE.opening);
      expect(document.activeElement).toBe(radio);
      expect(email.sendContactEmail).not.toHaveBeenCalled();
    });

    it("swaps one opening for another as the choice moves, as it does under the arrow keys", () => {
      choose(ROLE.word);
      const next = choose(PROJECT.word);

      expect(component.form.controls.message.value).toBe(PROJECT.opening);
      expect(radios().filter((radio) => radio.checked)).toEqual([next]);
      expect(document.activeElement).toBe(next);
    });

    it("never overwrites what the visitor has written themselves", () => {
      component.form.controls.message.setValue("My own first line");

      choose(ROLE.word);

      expect(component.form.controls.message.value).toBe("My own first line");
      expect(component.form.controls.topic.value).toBe(ROLE.word);
    });

    it("treats a message of only spaces as unwritten", () => {
      component.form.controls.message.setValue("   ");

      choose(HELLO.word);

      expect(component.form.controls.message.value).toBe(HELLO.opening);
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

    it("ties each error to its field for assistive technology, and writes it after the field", async () => {
      await send();

      for (const id of ["letter-message", "letter-name", "letter-email"]) {
        const field = element.querySelector<HTMLElement>(`#${id}`)!;
        const error = element.querySelector(`#${field.getAttribute("aria-describedby")}`)!;

        expect(field.getAttribute("aria-invalid")).withContext(id).toBe("true");
        expect(error).withContext(id).not.toBeNull();
        expect(field.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).withContext(id).toBeTruthy();
      }
    });

    it("marks nothing invalid on a letter that is in order", () => {
      component.form.setValue(VALID);
      fixture.detectChanges();

      for (const id of ["letter-message", "letter-name", "letter-email"]) {
        const field = element.querySelector<HTMLElement>(`#${id}`)!;
        expect(field.getAttribute("aria-invalid")).withContext(id).toBe("false");
        expect(field.hasAttribute("aria-describedby")).withContext(id).toBeFalse();
      }
    });

    for (const empty of ["   ", ROLE.opening, PROJECT.opening.trim()]) {
      it(`does not take "${empty}" for a letter`, async () => {
        component.form.setValue({ ...VALID, message: empty });

        await send();

        expect(errors()).toEqual(["Write a line or two first"]);
        expect(email.sendContactEmail).not.toHaveBeenCalled();
      });
    }

    it("does not take a circled topic with only its opening for a letter", async () => {
      choose(ROLE.word);
      component.form.patchValue({ name: VALID.name, email: VALID.email });

      await send();

      expect(errors()).toEqual(["Write a line or two first"]);
      expect(email.sendContactEmail).not.toHaveBeenCalled();
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

  describe("the seal", () => {
    it("is the submit button, named by the words printed beside it", () => {
      const seal = element.querySelector<HTMLButtonElement>("form button[type=submit]")!;

      expect(text(seal)).toBe("Seal and send");
      expect(seal.hasAttribute("aria-label")).toBeFalse();
      expect(seal.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(seal.disabled).toBeFalse();
      expect(element.querySelectorAll("form button").length).toBe(1);
    });

    it("cannot be pressed twice while a letter is on its way", () => {
      component.loading.set(true);
      fixture.detectChanges();

      const seal = element.querySelector<HTMLButtonElement>("button[type=submit]")!;
      expect(seal.disabled).toBeTrue();
      expect(text(seal)).toBe("Sending");
    });
  });

  describe("sending", () => {
    it("sends a letter with no topic exactly as it was written", async () => {
      await sendValid();

      expect(email.sendContactEmail).toHaveBeenCalledOnceWith(WRITTEN);
    });

    it("opens the message the owner receives with the circled topic", async () => {
      email.sendContactEmail.and.resolveTo();
      choose(PROJECT.word);
      component.form.patchValue({ ...WRITTEN, message: `${PROJECT.opening}a booking tool.` });

      await send();

      expect(email.sendContactEmail).toHaveBeenCalledOnceWith({
        ...WRITTEN,
        message: `Re: a project\n\n${PROJECT.opening}a booking tool.`,
      });
    });

    it("emits posted once, then says where the answer will go in place of the sheet", async () => {
      await sendValid();

      const sealed = element.querySelector<HTMLElement>(".sealed")!;
      expect(posted).toHaveBeenCalledTimes(1);
      expect(element.querySelector("form")).toBeNull();
      expect(sealed.getAttribute("role")).toBe("status");
      expect(element.querySelector(`#${sealed.getAttribute("aria-labelledby")}`)?.textContent).toContain("on its way");
      expect(sealed.textContent).toContain("Your letter is on its way.");
      expect(sealed.textContent).toContain("I will write back to ada@example.com.");
      expect(document.activeElement).toBe(sealed);
      expect(component.loading()).toBeFalse();
    });

    it("shows the letter as a sealed envelope: addressed, stamped and postmarked", async () => {
      await sendValid();

      const envelope = element.querySelector("app-letter-envelope")!;
      const postage = envelope.querySelector(".postage")!;
      expect(text(envelope.querySelector(".address"))).toBe("An envelope addressed to Felix Hollndonner, Room IV, Correspondence");
      expect(postage.getAttribute("aria-hidden")).toBe("true");
      expect(postage.querySelector(".stamp img")?.getAttribute("alt")).toBe("");
      expect(postage.querySelector("svg.postmark")).not.toBeNull();
      expect(envelope.querySelector("app-wax-seal svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(envelope.querySelector("a, button, input")).toBeNull();
    });

    it("keeps the section's heading, and the postscript beside the confirmation", async () => {
      await sendValid();

      expect(text(element.querySelector("h2"))).toBe("Write to me");
      expect(element.querySelectorAll("app-letter-postscript a").length).toBe(CORRESPONDENCE.links.length);
      expect(element.textContent!.replace("ada@example.com", "")).not.toMatch(/[\w.]+@[\w-]+\.\w+/);
    });

    it("starts a fresh letter from the confirmation, with focus on the message", async () => {
      email.sendContactEmail.and.resolveTo();
      choose(ROLE.word);
      component.form.patchValue(WRITTEN);
      await send();

      button("Write another letter").click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element.querySelector(".sealed")).toBeNull();
      expect(element.querySelector("app-letter-envelope")).toBeNull();
      expect(component.form.getRawValue()).toEqual({ topic: "", name: "", email: "", message: "" });
      expect(radios().some((radio) => radio.checked)).toBeFalse();
      expect(errors()).toEqual([]);
      expect(document.activeElement).toBe(message());
    });

    it("keeps what the visitor wrote when the mail service fails, and says so above the seal", async () => {
      email.sendContactEmail.and.rejectWith(new Error("network"));
      const kept = { ...VALID, topic: HELLO.word };
      component.form.setValue(kept);

      await send();

      const alert = element.querySelector('form [role="alert"]')!;
      expect(alert.textContent).toContain("The letter did not go out.");
      expect(alert.compareDocumentPosition(button("Seal and send")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(component.form.getRawValue()).toEqual(kept);
      expect(text(radios().find((radio) => radio.checked)?.closest("label"))).toBe(HELLO.word);
      expect(document.activeElement).toBe(button("Seal and send"));
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
      expect(posted).toHaveBeenCalledTimes(1);
    });
  });
});
