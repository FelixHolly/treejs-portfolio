import { ComponentFixture, TestBed } from "@angular/core/testing";
import { EntranceComponent } from "./entrance.component";

describe("EntranceComponent", () => {
  let fixture: ComponentFixture<EntranceComponent>;
  let element: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(EntranceComponent);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it("shows the name and role on first render, before the lion has loaded", () => {
    expect(element.querySelector("h1")?.textContent?.trim()).toBe("Felix Hollndonner");
    expect(element.querySelector(".eyebrow")?.textContent).toContain("Full-Stack Developer");
    expect(element.querySelector(".lion")?.classList.contains("lion--ready")).toBeFalse();
  });

  it("reveals the lion once its image has loaded", () => {
    element.querySelector("img")!.dispatchEvent(new Event("load"));
    fixture.detectChanges();

    expect(element.querySelector(".lion")?.classList.contains("lion--ready")).toBeTrue();
  });

  it("drops the lion and keeps the text when the image fails", () => {
    element.querySelector("img")!.dispatchEvent(new Event("error"));
    fixture.detectChanges();

    expect(element.querySelector("picture")).toBeNull();
    expect(element.querySelector("img")).toBeNull();
    expect(element.querySelector("h1")?.textContent?.trim()).toBe("Felix Hollndonner");
  });

  it("describes the statue for screen readers and links down to the works", () => {
    expect(element.querySelector("img")?.getAttribute("alt")).toContain("Viennese lion");
    expect(element.querySelector('a[href="#works"]')?.textContent).toContain("View the works");
  });
});
