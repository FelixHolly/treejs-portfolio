import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FloorPlanComponent } from "./floor-plan.component";

describe("FloorPlanComponent", () => {
  let fixture: ComponentFixture<FloorPlanComponent>;
  let element: HTMLElement;

  function show(current: string): void {
    fixture.componentRef.setInput("current", current);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(FloorPlanComponent);
    element = fixture.nativeElement;
    show("entrance");
  });

  const names = () => Array.from(element.querySelectorAll(".sr-only")).map((node) => node.textContent!.trim());

  it("draws one button per room, named for screen readers", () => {
    expect(names()).toEqual([
      "Entrance",
      "Room I, The Developer",
      "Room II, The Works",
      "Room III, Visitors' Book",
      "Room IV, Correspondence",
    ]);
    expect(element.querySelector("nav")?.getAttribute("aria-label")).toBe("Floor plan");
  });

  for (const [room, index, caption] of [
    ["entrance", 0, "Entrance"],
    ["works", 2, "Room II · The Works"],
    ["correspondence", 4, "Room IV · Correspondence"],
  ] as const) {
    it(`marks ${room} as the visitor's location`, () => {
      show(room);

      const current = Array.from(element.querySelectorAll("button")).map((button) => button.getAttribute("aria-current"));
      expect(current.filter(Boolean)).toEqual(["location"]);
      expect(current[index]).toBe("location");
      expect(element.querySelector(".caption")?.textContent?.trim()).toBe(caption);
    });
  }

  it("falls back to the entrance caption for an unknown room and marks nothing", () => {
    show("attic");

    expect(element.querySelectorAll("[aria-current]").length).toBe(0);
    expect(element.querySelector(".caption")?.textContent?.trim()).toBe("Entrance");
  });

  it("asks to visit the room whose button is pressed", () => {
    const visits: string[] = [];
    fixture.componentInstance.visit.subscribe((room) => visits.push(room));

    element.querySelectorAll("button")[3].click();
    element.querySelectorAll("button")[0].click();

    expect(visits).toEqual(["visitors-book", "entrance"]);
  });

  it("makes every room a target of at least 24 by 24 pixels", () => {
    document.body.appendChild(element);
    for (const button of Array.from(element.querySelectorAll("button"))) {
      const box = button.getBoundingClientRect();
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
    element.remove();
  });
});
