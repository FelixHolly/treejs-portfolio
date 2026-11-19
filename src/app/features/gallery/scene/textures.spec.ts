import { Texture } from "three";
import { coverFit, nameBoardTexture, plaqueTexture } from "./textures";

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

describe("plaqueTexture", () => {
  const TOOLS = ["Angular", "TypeScript", "RxJS", "NgRx Signals", "SCSS and Tailwind", "Three.js"];
  const ASPECT = 1.22;
  const canvasOf = (heading: string, lines: readonly string[], rows = 6) => plaqueTexture(heading, lines, rows, ASPECT).image as HTMLCanvasElement;
  /** The ink in each of the `rows` lines the band under the rule is cut into. */
  const band = (canvas: HTMLCanvasElement, rows: number) => {
    const pitch = (canvas.height - 178 - 58) / rows;
    return Array.from({ length: rows }, (_, row) => inked(canvas, 90, Math.round(178 + pitch * row), canvas.width - 180, Math.floor(pitch)));
  };

  it("is drawn at the plaque's own proportions, sharp enough for a screen of double density", () => {
    const canvas = canvasOf("Frontend", TOOLS);

    expect(canvas.width / canvas.height).toBeCloseTo(ASPECT, 2);
    expect(canvas.width).toBeGreaterThanOrEqual(1024);
  });

  it("letters the heading at the top with a rule under it, above the first line", () => {
    const canvas = canvasOf("Frontend", TOOLS);

    expect(inked(canvas, 90, 66, canvas.width - 180, 60)).toBeGreaterThan(0.01);
    expect(inked(canvas, canvas.width / 2 - 50, 146, 100, 3)).toBe(1);
    expect(inked(canvas, 40, 128, canvas.width - 80, 14)).toBe(0);
    expect(inked(canvas, 40, 152, canvas.width - 80, 24)).toBe(0);
  });

  it("letters one line for each tool", () => {
    const lines = band(canvasOf("Frontend", TOOLS), 6);

    expect(lines.length).toBe(6);
    for (const line of lines) expect(line).toBeGreaterThan(0.01);
  });

  it("keeps the longest area and the longest tools clear of the gold line inside the plaque's edge", () => {
    const canvas = canvasOf("Data and operations", ["Playwright and Cypress", "Accessibility testing", "SCSS and Tailwind"]);

    expect(inked(canvas, 34, 34, 50, canvas.height - 68)).toBe(0);
    expect(inked(canvas, canvas.width - 84, 34, 50, canvas.height - 68)).toBe(0);
  });

  it("sets a shorter list in the middle of a plaque sized for a longer one, at the same size of letter", () => {
    const full = canvasOf("Frontend", ["Java", "Java", "Java", "Java", "Java", "Java"]);
    const short = canvasOf("Backend", ["Java", "Java"]);
    const lines = band(short, 6);

    expect(short.height).toBe(full.height);
    expect(lines[0]).toBe(0);
    expect(lines[1]).toBe(0);
    expect(lines[4]).toBe(0);
    expect(lines[5]).toBe(0);
    expect(lines[2]).toBeCloseTo(band(full, 6)[2], 6);
    expect(lines[3]).toBeCloseTo(band(full, 6)[3], 6);
  });

  it("squeezes a long heading and a long line onto the plaque instead of running off it", () => {
    const canvas = canvasOf("An area with a very long name indeed", ["A tool whose name would never fit on one line of a plaque"], 1);

    expect(inked(canvas, 0, 0, 20, canvas.height)).toBe(0);
    expect(inked(canvas, canvas.width - 20, 0, 20, canvas.height)).toBe(0);
    expect(inked(canvas, 30, 60, 50, canvas.height - 120)).toBe(0);
    expect(inked(canvas, canvas.width - 80, 60, 50, canvas.height - 120)).toBe(0);
  });

  it("leaves out lines beyond the rows it was sized for, and is still a plaque with none", () => {
    const over = canvasOf("Frontend", [...TOOLS, "One too many"]);
    const empty = canvasOf("Frontend", [], 0);

    expect(band(over, 6)).toEqual(band(canvasOf("Frontend", TOOLS), 6));
    expect(inked(empty, 40, 178, empty.width - 80, empty.height - 228)).toBe(0);
    expect(inked(empty, 90, 66, empty.width - 180, 60)).toBeGreaterThan(0.01);
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

  it("takes the proportions it is given for a source that has no width of its own, such as a video", () => {
    const film = new Texture();
    film.image = { videoWidth: 2000, videoHeight: 1000 };
    coverFit(film, 1, 2);

    expect(film.repeat.x).toBeCloseTo(0.5, 6);
    expect(film.repeat.y).toBe(1);
    expect(film.offset.x).toBeCloseTo(0.25, 6);
  });

  it("leaves an image of the frame's own proportions whole", () => {
    const exact = texture(1600, 1000);
    coverFit(exact, 1.6);

    expect(exact.repeat.x).toBeCloseTo(1, 6);
    expect(exact.repeat.y).toBeCloseTo(1, 6);
  });
});
