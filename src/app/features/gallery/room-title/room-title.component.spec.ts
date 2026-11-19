import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ROOMS } from "../../../core/place/places";
import { RoomTitleComponent } from "./room-title.component";

describe("RoomTitleComponent", () => {
  let fixture: ComponentFixture<RoomTitleComponent>;
  let element: HTMLElement;

  function show(room: (typeof ROOMS)[number] | null, shown: boolean): void {
    fixture.componentRef.setInput("room", room);
    fixture.componentRef.setInput("shown", shown);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(RoomTitleComponent);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    element.remove();
  });

  it("is empty and unseen until a room is titled", () => {
    expect(element.textContent?.trim()).toBe("");
    expect(element.classList.contains("shown")).toBeFalse();
    expect(getComputedStyle(element).opacity).toBe("0");
  });

  it("letters the numeral over a rule over the name", () => {
    show(ROOMS[2], true);

    expect(element.querySelector(".numeral")?.textContent).toBe("II");
    expect(element.querySelector(".name")?.textContent).toBe("The Works");
    expect(Array.from(element.querySelector(".card")!.children).map((child) => child.className)).toEqual(["numeral", "rule", "name"]);
    expect(element.classList.contains("shown")).toBeTrue();
  });

  it("keeps its lettering while it fades", () => {
    show(ROOMS[3], true);
    show(ROOMS[3], false);

    expect(element.classList.contains("shown")).toBeFalse();
    expect(element.querySelector(".name")?.textContent).toBe("Visitors' Book");
  });

  it("letters the next room alone when one title gives way to another", () => {
    show(ROOMS[3], true);
    show(ROOMS[4], true);

    expect(Array.from(element.querySelectorAll(".name")).map((name) => name.textContent)).toEqual(["Correspondence"]);
    expect(element.classList.contains("shown")).toBeTrue();
  });

  it("is empty again once the room is taken away", () => {
    show(ROOMS[3], true);
    show(null, false);

    expect(element.querySelector(".card")).toBeNull();
  });

  it("is kept from assistive technology, the Tab key and the mouse: the header and the label already say it", () => {
    show(ROOMS[4], true);

    expect(element.getAttribute("aria-hidden")).toBe("true");
    expect(element.querySelector("h1, h2, h3, a, button, input, [tabindex]")).toBeNull();
    expect(getComputedStyle(element).pointerEvents).toBe("none");
    expect(getComputedStyle(element.querySelector(".name")!).pointerEvents).toBe("none");
  });

  it("lets a click through to whatever lies under it", () => {
    show(ROOMS[1], true);
    const box = element.querySelector(".name")!.getBoundingClientRect();

    expect(element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))).toBeFalse();
  });
});
