import { CanvasTexture, RepeatWrapping, Texture } from "three";
import {
  brushedTexture,
  coverFit,
  lampshadeTexture,
  nameBoardTexture,
  plaqueTexture,
  ROOM_NAME_ASPECT,
  roomNameTexture,
  walnutTexture,
  writtenPageTexture,
} from "./textures";

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

describe("the furniture's drawn surfaces", () => {
  const canvasOf = (texture: CanvasTexture) => texture.image as HTMLCanvasElement;
  const pixels = (canvas: HTMLCanvasElement) => canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
  /** The red level at a pixel; these surfaces are drawn opaque. */
  const level = (data: Uint8ClampedArray, canvas: HTMLCanvasElement, x: number, y: number) => data[(y * canvas.width + x) * 4];
  /** The mean level of one row of pixels, in one colour channel. */
  function row(canvas: HTMLCanvasElement, y: number, channel = 0): number {
    const data = pixels(canvas);
    let sum = 0;
    for (let x = 0; x < canvas.width; x++) sum += data[(y * canvas.width + x) * 4 + channel];
    return sum / canvas.width;
  }
  /** How much pixels differ on average from their neighbour `dx` across and `dy` down, wrapping at the edges; `only` keeps to one column or row. */
  function change(canvas: HTMLCanvasElement, dx: number, dy: number, only: { x?: number; y?: number } = {}): number {
    const data = pixels(canvas);
    let sum = 0;
    let count = 0;
    for (let y = only.y ?? 0; y <= (only.y ?? canvas.height - 1); y++) {
      for (let x = only.x ?? 0; x <= (only.x ?? canvas.width - 1); x++) {
        sum += Math.abs(level(data, canvas, x, y) - level(data, canvas, (x + dx) % canvas.width, (y + dy) % canvas.height));
        count += 1;
      }
    }
    return sum / count;
  }

  it("keeps the repeating ones small and lets them repeat both ways", () => {
    for (const texture of [walnutTexture(), brushedTexture(), lampshadeTexture()]) {
      expect(texture.wrapS).toBe(RepeatWrapping);
      expect(texture.wrapT).toBe(RepeatWrapping);
      expect(canvasOf(texture).width).toBeLessThanOrEqual(512);
      expect(canvasOf(texture).height).toBeLessThanOrEqual(512);
    }
  });

  it("draws the same walnut and the same handwriting on every visit", () => {
    expect(pixels(canvasOf(walnutTexture()))).toEqual(pixels(canvasOf(walnutTexture())));
    expect(pixels(canvasOf(writtenPageTexture()))).toEqual(pixels(canvasOf(writtenPageTexture())));
  });

  it("runs the walnut's grain up the canvas: it changes far more across than along", () => {
    const canvas = canvasOf(walnutTexture());

    expect(change(canvas, 1, 0)).toBeGreaterThan(change(canvas, 0, 1) * 4);
    expect(change(canvas, 1, 0)).toBeGreaterThan(1);
  });

  it("joins the walnut to itself without a seam where it repeats", () => {
    const canvas = canvasOf(walnutTexture());

    expect(change(canvas, 1, 0, { x: canvas.width - 1 })).toBeLessThan(change(canvas, 1, 0) * 2.5);
    expect(change(canvas, 0, 1, { y: canvas.height - 1 })).toBeLessThan(change(canvas, 0, 1) * 2.5 + 1);
  });

  it("keeps the walnut a dark, warm brown", () => {
    const canvas = canvasOf(walnutTexture());
    const mean = [0, 1, 2].map((channel) => {
      let sum = 0;
      for (let y = 0; y < canvas.height; y += 8) sum += row(canvas, y, channel);
      return sum / (canvas.height / 8);
    });

    expect(mean[0]).toBeGreaterThan(mean[1] * 1.3);
    expect(mean[1]).toBeGreaterThan(mean[2] * 1.2);
    expect(mean[0]).toBeLessThan(120);
  });

  it("draws brushed metal pale enough to multiply over a colour, lightest in a band below its top edge", () => {
    const canvas = canvasOf(brushedTexture());
    const band = row(canvas, Math.round(canvas.height * 0.2));

    expect(band).toBeGreaterThan(row(canvas, 0) + 15);
    expect(band).toBeGreaterThan(row(canvas, canvas.height - 1) + 40);
    expect(pixels(canvas).filter((_, index) => index % 4 === 0).every((value) => value > 150)).toBeTrue();
  });

  it("lights the lampshade from inside: brightest around the bulb, dimmer at both rims", () => {
    const canvas = canvasOf(lampshadeTexture());
    const bulb = row(canvas, Math.round(canvas.height * 0.58), 1);

    expect(bulb).toBeGreaterThan(row(canvas, 0, 1) + 60);
    expect(bulb).toBeGreaterThan(row(canvas, canvas.height - 1, 1) + 50);
  });

  it("writes a few lines on a sheet of paper, inside its margins", () => {
    const canvas = canvasOf(writtenPageTexture());
    const data = pixels(canvas);
    const ink = (x: number, y: number, width: number, height: number) => {
      let dark = 0;
      for (let py = y; py < y + height; py++) for (let px = x; px < x + width; px++) if (level(data, canvas, px, py) < 150) dark += 1;
      return dark / (width * height);
    };

    expect(ink(0, 0, canvas.width, canvas.height)).toBeGreaterThan(0.01);
    expect(ink(0, 0, canvas.width, canvas.height)).toBeLessThan(0.15);
    expect(ink(0, 0, 24, canvas.height)).toBe(0);
    expect(ink(canvas.width - 20, 0, 20, canvas.height)).toBe(0);
    expect(ink(0, 0, canvas.width, 50)).toBe(0);
    expect(ink(0, canvas.height - 50, canvas.width, 50)).toBe(0);
  });
});

describe("roomNameTexture", () => {
  const canvasOf = (numeral: string, name: string) => roomNameTexture(numeral, name).image as HTMLCanvasElement;
  /** Of the fully lettered pixels in a band of the canvas: their mean colour, where their middle lies across it, and their share of the band. */
  function lettering(canvas: HTMLCanvasElement, y: number, height: number): { colour: number[]; middle: number; share: number } {
    const { data } = canvas.getContext("2d")!.getImageData(0, y, canvas.width, height);
    const sum = [0, 0, 0];
    let across = 0;
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] < 250) continue;
      for (let channel = 0; channel < 3; channel++) sum[channel] += data[index + channel];
      across += (index / 4) % canvas.width;
      count += 1;
    }
    const pixelCount = Math.max(count, 1);
    return { colour: sum.map((value) => value / pixelCount), middle: across / pixelCount, share: count / (canvas.width * height) };
  }
  /** True where nothing at all is drawn in a strip of the canvas. */
  const bare = (canvas: HTMLCanvasElement, x: number, width: number) =>
    canvas
      .getContext("2d")!
      .getImageData(x, 0, width, canvas.height)
      .data.every((value) => value === 0);

  it("is drawn at the proportions its wall lettering keeps, sharp enough for a screen of double density", () => {
    const canvas = canvasOf("I", "The Developer");

    expect(canvas.width / canvas.height).toBeCloseTo(ROOM_NAME_ASPECT, 6);
    expect(canvas.width).toBeGreaterThanOrEqual(1536);
  });

  it("letters on nothing: the wall shows between the letters", () => {
    const canvas = canvasOf("II", "The Works");
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    for (let index = 3; index < data.length; index += 4) if (data[index] === 0) clear += 1;

    expect(clear / (data.length / 4)).toBeGreaterThan(0.8);
    expect(data[3]).toBe(0);
  });

  it("sets the numeral in gold over a gold rule, and the name under them in bone", () => {
    const canvas = canvasOf("III", "Visitors' Book");
    const numeral = lettering(canvas, 90, 120);
    const rule = lettering(canvas, 282, 5);
    const name = lettering(canvas, 340, 200);

    expect(numeral.share).toBeGreaterThan(0.005);
    expect(numeral.colour[0]).toBeCloseTo(199, -1);
    expect(numeral.colour[2]).toBeCloseTo(74, -1);
    expect(rule.share).toBeGreaterThan(0.05);
    expect(rule.colour[2]).toBeCloseTo(74, -1);
    expect(name.share).toBeGreaterThan(0.02);
    expect(name.colour[0]).toBeCloseTo(232, -1);
    expect(name.colour[2]).toBeCloseTo(222, -1);
    expect(lettering(canvas, 232, 40).share).toBe(0);
    expect(lettering(canvas, 296, 30).share).toBe(0);
  });

  it("centres numeral, rule and name on one axis, whatever the numeral's letter spacing", () => {
    const rooms = [
      ["I", "The Developer"],
      ["III", "Visitors' Book"],
      ["IV", "Correspondence"],
    ];

    for (const [numeral, name] of rooms) {
      const canvas = canvasOf(numeral, name);

      expect(Math.abs(lettering(canvas, 90, 120).middle - canvas.width / 2)).withContext(numeral).toBeLessThan(8);
      expect(Math.abs(lettering(canvas, 282, 5).middle - canvas.width / 2)).withContext(numeral).toBeLessThan(1);
      expect(Math.abs(lettering(canvas, 340, 200).middle - canvas.width / 2)).withContext(name).toBeLessThan(24);
    }
  });

  it("squeezes a name too long for the wall instead of running off it", () => {
    const long = canvasOf("IV", "A room whose name goes on for a good deal longer than a wall is wide");

    expect(lettering(long, 340, 200).share).toBeGreaterThan(0.02);
    expect(bare(long, 0, 30)).toBeTrue();
    expect(bare(long, long.width - 30, 30)).toBeTrue();
  });
});
