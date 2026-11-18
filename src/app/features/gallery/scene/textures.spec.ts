import { Texture } from "three";
import { PLATE } from "./layout";
import { sectionPlateTexture } from "./plate";
import { coverFit, nameBoardTexture } from "./textures";

/** The share of a canvas region that is brighter than the dark ground it was painted on. */
function inked(canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): number {
  const { data } = canvas.getContext("2d")!.getImageData(x, y, width, height);
  let bright = 0;
  for (let index = 0; index < data.length; index += 4) if (data[index] > 90) bright += 1;
  return bright / (width * height);
}

describe("nameBoardTexture", () => {
  it("is drawn at the board's own proportions, so the lettering is never stretched", () => {
    const canvas = nameBoardTexture(["Polypoint AG", "Eurotours"], 2.4).image as HTMLCanvasElement;

    expect(canvas.width / canvas.height).toBeCloseTo(2.4, 1);
  });

  it("letters every name on its own line of a dark board", () => {
    const canvas = nameBoardTexture(["One", "Two"], 2).image as HTMLCanvasElement;
    const half = canvas.height / 2;

    expect(inked(canvas, 200, 60, canvas.width - 400, half - 60)).toBeGreaterThan(0.005);
    expect(inked(canvas, 200, half, canvas.width - 400, half - 60)).toBeGreaterThan(0.005);
    expect(inked(canvas, 40, 40, 60, 60)).toBe(0);
  });

  it("squeezes a very long name onto the board instead of running off it", () => {
    const canvas = nameBoardTexture(["A very long company name that would never fit on one line of the board"], 2.4).image as HTMLCanvasElement;

    expect(inked(canvas, 0, 0, 20, canvas.height)).toBe(0);
    expect(inked(canvas, canvas.width - 20, 0, 20, canvas.height)).toBe(0);
  });

  it("is still a board when there is nobody to name", () => {
    const canvas = nameBoardTexture([], 2.4).image as HTMLCanvasElement;

    expect(canvas.width).toBeGreaterThan(0);
    expect(inked(canvas, 100, 100, canvas.width - 200, canvas.height - 200)).toBe(0);
  });
});

describe("sectionPlateTexture", () => {
  const STOREYS = [
    { caption: "What the visitor sees", tools: ["Angular", "TypeScript"] },
    { caption: "Where the work is done", tools: ["Java"] },
    { caption: "Where it is kept", tools: ["PostgreSQL"] },
    { caption: "What it stands on", tools: ["Docker"] },
  ];
  /** The part of the sheet to the right of the house, where the notes are lettered. */
  const notes = (canvas: HTMLCanvasElement) => inked(canvas, 1000, 300, 900, 760);

  it("is drawn on a sheet in the proportions of its frame", () => {
    const canvas = sectionPlateTexture(STOREYS).image as HTMLCanvasElement;

    expect(canvas.width / canvas.height).toBeCloseTo(PLATE.width / PLATE.height, 6);
  });

  it("draws the house and its title whatever storeys it is given", () => {
    const canvas = sectionPlateTexture([]).image as HTMLCanvasElement;

    expect(inked(canvas, 240, 160, 660, 900)).toBeGreaterThan(0.02);
    expect(inked(canvas, 100, 1110, 900, 110)).toBeGreaterThan(0.005);
    expect(notes(canvas)).toBe(0);
  });

  it("letters one note beside the house for each storey", () => {
    const one = notes(sectionPlateTexture(STOREYS.slice(0, 1)).image as HTMLCanvasElement);
    const all = notes(sectionPlateTexture(STOREYS).image as HTMLCanvasElement);

    expect(one).toBeGreaterThan(0);
    expect(all).toBeGreaterThan(one * 2);
  });

  it("ignores storeys beyond the four the house has", () => {
    const four = sectionPlateTexture(STOREYS).image as HTMLCanvasElement;
    const six = sectionPlateTexture([...STOREYS, ...STOREYS.slice(0, 2)]).image as HTMLCanvasElement;

    expect(notes(six)).toBe(notes(four));
  });
});

describe("coverFit", () => {
  const texture = (width: number, height: number) => {
    const made = new Texture();
    made.image = { width, height };
    return made;
  };

  it("crops the sides of an image wider than its frame, keeping it centred", () => {
    const wide = texture(2000, 1000);
    coverFit(wide, 1);

    expect(wide.repeat.x).toBeCloseTo(0.5, 6);
    expect(wide.repeat.y).toBe(1);
    expect(wide.offset.x).toBeCloseTo(0.25, 6);
  });

  it("crops the bottom of an image taller than its frame, keeping its top", () => {
    const tall = texture(1000, 2000);
    coverFit(tall, 1);

    expect(tall.repeat.y).toBeCloseTo(0.5, 6);
    expect(tall.repeat.x).toBe(1);
    expect(tall.offset.y).toBeCloseTo(0.5, 6);
  });

  it("leaves an image of the frame's own proportions whole", () => {
    const exact = texture(1600, 1000);
    coverFit(exact, 1.6);

    expect(exact.repeat.x).toBeCloseTo(1, 6);
    expect(exact.repeat.y).toBeCloseTo(1, 6);
  });
});
