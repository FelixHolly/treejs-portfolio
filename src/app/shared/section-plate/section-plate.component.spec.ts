import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NOTE_LEADERS, Storey } from "./draw-section-plate";
import { SectionPlateComponent } from "./section-plate.component";

const STOREYS: Storey[] = [
  { caption: "What the visitor sees", tools: ["Angular", "TypeScript", "NgRx", "Tailwind"] },
  { caption: "Where the work is done", tools: ["Java", "Spring Boot"] },
  { caption: "Where it is kept", tools: ["PostgreSQL"] },
  { caption: "What it stands on", tools: ["Docker"] },
];

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe("SectionPlateComponent", () => {
  let fixture: ComponentFixture<SectionPlateComponent>;
  let element: HTMLElement;

  function render(storeys: readonly Storey[], width = "40rem"): void {
    fixture = TestBed.createComponent(SectionPlateComponent);
    fixture.componentRef.setInput("storeys", storeys);
    element = fixture.nativeElement;
    element.style.width = width;
    fixture.detectChanges();
  }

  const canvas = () => element.querySelector("canvas")!;
  const texts = (selector: string, within: ParentNode = element) =>
    Array.from(within.querySelectorAll(selector)).map((node) => node.textContent!.trim());

  /** The house is drawn a frame or two after the fonts settle; this waits until it fits the canvas's box. */
  async function drawn(): Promise<void> {
    await fixture.whenStable();
    await document.fonts.ready;
    for (let attempt = 0; attempt < 60; attempt++) {
      await frame();
      if (canvas().width === Math.round(canvas().getBoundingClientRect().width * devicePixelRatio)) return;
    }
    throw new Error("the house was never drawn at its box's size");
  }

  function inked(): number {
    const { data } = canvas().getContext("2d")!.getImageData(0, 0, canvas().width, canvas().height);
    let count = 0;
    for (let index = 3; index < data.length; index += 4) if (data[index] > 100) count += 1;
    return count;
  }

  describe("its notes", () => {
    it("letters one note per storey, in order, with caption and tools as text", () => {
      render(STOREYS);

      expect(texts("dt")).toEqual(STOREYS.map((storey) => storey.caption));
      expect(Array.from(element.querySelectorAll(".note")).map((note) => texts("li", note))).toEqual(
        STOREYS.map((storey) => [...storey.tools]),
      );
    });

    it("leaves out storeys beyond the four the house has", () => {
      render([...STOREYS, { caption: "A fifth", tools: ["Extra"] }]);

      expect(texts("dt")).toEqual(STOREYS.map((storey) => storey.caption));
      expect(element.querySelectorAll("polyline").length).toBe(4);
    });

    it("follows the storeys when they change", () => {
      render(STOREYS);
      fixture.componentRef.setInput("storeys", STOREYS.slice(0, 2));
      fixture.detectChanges();

      expect(texts("dt")).toEqual(STOREYS.slice(0, 2).map((storey) => storey.caption));
      expect(element.querySelectorAll("polyline").length).toBe(2);
    });

    it("copes with zero storeys: the house and its caption, no empty list, no leaders", async () => {
      render([]);
      await drawn();

      expect(element.querySelector("dl")).toBeNull();
      expect(element.querySelectorAll("polyline, circle").length).toBe(0);
      expect(inked()).toBeGreaterThan(0);
      expect(element.querySelector("figcaption")?.textContent).toContain("Section through a web application");
    });
  });

  describe("for assistive technology", () => {
    it("hides the canvas and its leaders, and keeps the notes and the caption readable", () => {
      render(STOREYS);
      const hidden = element.querySelector('[aria-hidden="true"]')!;

      expect(hidden.contains(canvas())).toBeTrue();
      expect(hidden.contains(element.querySelector("svg"))).toBeTrue();
      expect(element.querySelector("dl")!.closest("[aria-hidden]")).toBeNull();
      expect(element.querySelector("figure > figcaption")?.textContent?.trim()).toBe("Plate I · Section through a web application");
      expect(hidden.querySelector("a, button, [tabindex]")).toBeNull();
    });
  });

  describe("the house", () => {
    it("is drawn at the size it is shown, pixel for pixel", async () => {
      render(STOREYS);
      await drawn();

      expect(canvas().width).toBe(Math.round(canvas().getBoundingClientRect().width * devicePixelRatio));
      expect(canvas().width / canvas().height).toBeCloseTo(888 / 934, 1);
      expect(inked()).toBeGreaterThan(0);
    });

    it("is redrawn when its size changes", async () => {
      render(STOREYS);
      await drawn();
      const before = canvas().width;

      element.style.width = "18rem";
      await drawn();

      expect(canvas().width).toBeLessThan(before);
      expect(inked()).toBeGreaterThan(0);
    });

    it("is never watched once the plate has gone before the fonts were ready", async () => {
      const observe = spyOn(ResizeObserver.prototype, "observe").and.callThrough();
      render(STOREYS);
      fixture.destroy();
      await document.fonts.ready;
      await frame();

      expect(observe).not.toHaveBeenCalled();
    });

    it("stops being watched when the plate goes", async () => {
      const disconnect = spyOn(ResizeObserver.prototype, "disconnect").and.callThrough();
      render(STOREYS);
      await drawn();
      fixture.destroy();

      expect(disconnect).toHaveBeenCalled();
    });
  });

  describe("layout", () => {
    const top = (node: Element) => node.getBoundingClientRect().top;

    it("sets the notes beside the house when there is room, each where its leader ends", async () => {
      render(STOREYS, "40rem");
      await drawn();
      const house = canvas().getBoundingClientRect();

      expect(getComputedStyle(element.querySelector(".leaders")!).display).toBe("block");
      Array.from(element.querySelectorAll("dd")).forEach((tools, index) => {
        expect(tools.getBoundingClientRect().left).toBeGreaterThan(house.right);
        expect((top(tools) - house.top) / house.height)
          .withContext(STOREYS[index].caption)
          .toBeCloseTo(NOTE_LEADERS[index].row, 2);
      });
    });

    it("keeps that alignment at the narrowest width that still has the notes beside the house", async () => {
      render(STOREYS, "34rem");
      await drawn();
      const house = canvas().getBoundingClientRect();

      Array.from(element.querySelectorAll("dd")).forEach((tools, index) => {
        expect((top(tools) - house.top) / house.height).toBeCloseTo(NOTE_LEADERS[index].row, 2);
      });
    });

    it("pushes a note down instead of printing over it when the one above outgrows its gap", async () => {
      const crowded = [{ caption: STOREYS[0].caption, tools: Array.from({ length: 14 }, (_, index) => `Instrument ${index}`) }, ...STOREYS.slice(1)];
      render(crowded, "35rem");
      await drawn();
      const notes = Array.from(element.querySelectorAll(".note"));

      for (let index = 1; index < notes.length; index++) {
        const above = notes[index - 1].querySelector("dd")!.getBoundingClientRect().bottom;
        expect(top(notes[index].querySelector("dt")!)).toBeGreaterThanOrEqual(above - 0.5);
      }
    });

    it("stacks the notes under the house, without leaders, on a phone", async () => {
      render(STOREYS, "20rem");
      await drawn();
      const house = canvas().getBoundingClientRect();
      const host = element.getBoundingClientRect();

      expect(getComputedStyle(element.querySelector(".leaders")!).display).toBe("none");
      expect(top(element.querySelector("dt")!)).toBeGreaterThanOrEqual(house.bottom);
      expect(Math.abs(house.left + house.right - (host.left + host.right))).toBeLessThan(2);
    });

    it("fits a 320px phone's column without anything sticking out", async () => {
      render(STOREYS, "280px");
      await drawn();
      const host = element.getBoundingClientRect();

      for (const node of Array.from(element.querySelectorAll("canvas, dt, li, figcaption"))) {
        const box = node.getBoundingClientRect();
        expect(box.left).toBeGreaterThanOrEqual(host.left - 0.5);
        expect(box.right).toBeLessThanOrEqual(host.right + 0.5);
      }
    });
  });
});
