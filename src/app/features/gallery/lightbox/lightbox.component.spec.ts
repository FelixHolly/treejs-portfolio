import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Work } from "../../../core/content/work.model";
import { WORKS } from "../../../core/content/works.content";
import { LightboxComponent } from "./lightbox.component";

const PLAIN: Work = { ...WORKS[1], caseStudy: undefined, film: undefined };
const WITH_ACCOUNT: Work = {
  ...PLAIN,
  caseStudy: [
    { heading: "How it is built", text: "One app." },
    { heading: "In numbers", text: "Many tests." },
  ],
};
const WITH_FILM: Work = { ...PLAIN, film: { src: "assets/works/piece-film.webm", description: "A visit to the site." } };

describe("LightboxComponent", () => {
  let fixture: ComponentFixture<LightboxComponent>;
  let dialog: HTMLDialogElement;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(LightboxComponent);
    document.body.appendChild(fixture.nativeElement);
    await settle();
    dialog = fixture.nativeElement.querySelector("dialog");
  });

  afterEach(() => {
    if (dialog.open) dialog.close();
    fixture.nativeElement.remove();
  });

  it("starts closed and empty", () => {
    expect(dialog.open).toBeFalse();
    expect(dialog.querySelector("img")).toBeNull();
  });

  it("opens as a modal titled with the work, showing its pictures and the extra phone view", async () => {
    fixture.componentInstance.open(WORKS[0]);
    await settle();

    expect(dialog.open).toBeTrue();
    expect(dialog.matches(":modal")).toBeTrue();
    expect(dialog.querySelector("h2")?.textContent).toBe("Küchenschelle");
    expect(dialog.getAttribute("aria-labelledby")).toBe(dialog.querySelector("h2")?.id ?? "missing");
    expect(dialog.querySelectorAll("img").length).toBe(4);
    expect(Array.from(dialog.querySelectorAll("img")).every((image) => image.alt.length > 10)).toBeTrue();
  });

  it("puts keyboard focus on the close button", async () => {
    fixture.componentInstance.open(WORKS[1]);
    await settle();

    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close the closer look");
  });

  it("shows only the work's own pictures when it has no extra views", async () => {
    fixture.componentInstance.open(WORKS[1]);
    await settle();

    expect(dialog.querySelectorAll("img").length).toBe(1);
  });

  it("closes from its button and forgets the work", async () => {
    fixture.componentInstance.open(WORKS[0]);
    await settle();

    const closed = new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
    dialog.querySelector<HTMLButtonElement>("button")!.click();
    await closed;
    await settle();

    expect(dialog.open).toBeFalse();
    expect(fixture.componentInstance.work()).toBeNull();
    expect(dialog.querySelector("img")).toBeNull();
  });

  it("closes on a click on the backdrop but not on a click inside", async () => {
    fixture.componentInstance.open(WORKS[0]);
    await settle();

    dialog.querySelector<HTMLElement>(".panel")!.click();
    expect(dialog.open).toBeTrue();

    dialog.click();
    await settle();
    expect(dialog.open).toBeFalse();
  });

  describe("a work's account and film", () => {
    it("shows neither for a work that has none", async () => {
      fixture.componentInstance.open(PLAIN);
      await settle();

      expect(dialog.querySelector("app-case-study")).toBeNull();
      expect(dialog.querySelector("video")).toBeNull();
      expect(dialog.querySelectorAll("h3").length).toBe(0);
    });

    it("gives the account after the title and before the pictures, under headings one level below the title", async () => {
      fixture.componentInstance.open(WITH_ACCOUNT);
      await settle();

      const order = Array.from(dialog.querySelectorAll("h2, app-case-study, img")).map((node) => node.tagName);
      expect(order).toEqual(["H2", "APP-CASE-STUDY", "IMG"]);
      expect(Array.from(dialog.querySelectorAll("h1, h2, h3, h4")).map((heading) => `${heading.tagName} ${heading.textContent}`)).toEqual([
        `H2 ${WITH_ACCOUNT.title}`,
        "H3 How it is built",
        "H3 In numbers",
      ]);
      expect(dialog.querySelector("video")).toBeNull();
    });

    it("scrolls the account with the rest of the dialog rather than in a box of its own", async () => {
      fixture.componentInstance.open(WITH_ACCOUNT);
      await settle();

      expect(getComputedStyle(dialog).overflowY).toBe("auto");
      expect(getComputedStyle(dialog.querySelector("app-case-study")!).overflowY).toBe("visible");
    });

    it("offers the film before the pictures with its own controls, standing on the first picture, never playing by itself", async () => {
      fixture.componentInstance.open(WITH_FILM);
      await settle();

      const video = dialog.querySelector("video")!;
      const order = Array.from(dialog.querySelectorAll(".sheet video, .sheet img")).map((node) => node.tagName);

      expect(order).toEqual(["VIDEO", "IMG"]);
      expect(video.controls).toBeTrue();
      expect(video.muted).toBeTrue();
      expect(video.autoplay).toBeFalse();
      expect(video.paused).toBeTrue();
      expect(video.preload).toBe("none");
      expect(video.hasAttribute("playsinline")).toBeTrue();
      expect(video.getAttribute("src")).toBe("assets/works/piece-film.webm");
      expect(video.getAttribute("poster")).toBe(WITH_FILM.images[0].src);
      expect(video.getAttribute("aria-label")).toBe("A visit to the site.");
      expect(dialog.querySelector("app-case-study")).toBeNull();
    });

    it("gives the commission both: four headed parts, then its film, then its four pictures", async () => {
      fixture.componentInstance.open(WORKS[0]);
      await settle();

      expect(Array.from(dialog.querySelectorAll("h3")).map((heading) => heading.textContent)).toEqual([
        "How it is built",
        "From video to recipe",
        "Two decisions",
        "In numbers",
      ]);
      expect(Array.from(dialog.querySelectorAll("app-case-study, video, img")).map((node) => node.tagName)).toEqual([
        "APP-CASE-STUDY",
        "VIDEO",
        "IMG",
        "IMG",
        "IMG",
        "IMG",
      ]);
    });

    it("still puts keyboard focus on the close button when a film is offered", async () => {
      fixture.componentInstance.open(WITH_FILM);
      await settle();

      expect(document.activeElement?.getAttribute("aria-label")).toBe("Close the closer look");
    });

    it("drops the account and film when the next work has none", async () => {
      fixture.componentInstance.open(WORKS[0]);
      await settle();
      fixture.componentInstance.close();
      await settle();

      fixture.componentInstance.open(PLAIN);
      await settle();

      expect(dialog.querySelector("app-case-study")).toBeNull();
      expect(dialog.querySelector("video")).toBeNull();
    });
  });

  it("says when it has closed, however it was closed", async () => {
    const closed = jasmine.createSpy("closed");
    fixture.componentInstance.closed.subscribe(closed);

    fixture.componentInstance.open(WORKS[0]);
    await settle();
    expect(closed).not.toHaveBeenCalled();

    const gone = new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
    dialog.close();
    await gone;

    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("replaces the pictures when another work is opened after closing", async () => {
    fixture.componentInstance.open(WORKS[0]);
    await settle();
    fixture.componentInstance.close();
    await settle();

    fixture.componentInstance.open(WORKS[2]);
    await settle();

    expect(dialog.querySelector("h2")?.textContent).toBe("ReLoo");
    expect(dialog.querySelectorAll("img").length).toBe(1);
  });
});
