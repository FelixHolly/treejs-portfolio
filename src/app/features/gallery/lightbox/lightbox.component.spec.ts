import { ComponentFixture, TestBed } from "@angular/core/testing";
import { WORKS } from "../../../core/content/works.content";
import { LightboxComponent } from "./lightbox.component";

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
