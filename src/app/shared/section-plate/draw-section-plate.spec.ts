import { drawHouse, drawSectionPlate, HOUSE_VIEW, NOTE_LEADERS, SHEET } from "./draw-section-plate";

const STOREYS = [
  { caption: "What the visitor sees", tools: ["Angular", "TypeScript"] },
  { caption: "Where the work is done", tools: ["Java"] },
  { caption: "Where it is kept", tools: ["PostgreSQL"] },
  { caption: "What it stands on", tools: ["Docker"] },
];

/** The share of a region, given in sheet pixels, that `marked` counts as drawn on. */
function share(
  canvas: HTMLCanvasElement,
  [x, y, width, height]: readonly number[],
  marked: (red: number, alpha: number) => boolean,
  scale = 1,
  origin = { x: 0, y: 0 },
): number {
  const box = [(x - origin.x) * scale, (y - origin.y) * scale, width * scale, height * scale].map(Math.round);
  const { data } = canvas.getContext("2d")!.getImageData(box[0], box[1], box[2], box[3]);
  let count = 0;
  for (let index = 0; index < data.length; index += 4) if (marked(data[index], data[index + 3])) count += 1;
  return count / (box[2] * box[3]);
}

const onPaper = (red: number) => red > 90;
const onClearGround = (_red: number, alpha: number) => alpha > 100;

function houseAlone(width: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  drawHouse(canvas, width);
  return canvas;
}

describe("drawHouse", () => {
  const inHouse = (canvas: HTMLCanvasElement, region: readonly number[]) =>
    share(canvas, region, onClearGround, canvas.width / HOUSE_VIEW.width, HOUSE_VIEW);

  it("sizes the canvas to the width it is given, in the proportions of the house's view", () => {
    const canvas = houseAlone(444);

    expect(canvas.width).toBe(444);
    expect(canvas.width / canvas.height).toBeCloseTo(HOUSE_VIEW.width / HOUSE_VIEW.height, 2);
  });

  it("rounds a fractional width to whole pixels", () => {
    const canvas = houseAlone(567.2);

    expect(canvas.width).toBe(567);
    expect(canvas.height).toBe(597);
  });

  it("draws every storey and the dimension line", () => {
    const canvas = houseAlone(HOUSE_VIEW.width);

    expect(inHouse(canvas, [234, 170, 672, 144])).withContext("roof").toBeGreaterThan(0.02);
    expect(inHouse(canvas, [270, 314, 600, 246])).withContext("colonnade").toBeGreaterThan(0.02);
    expect(inHouse(canvas, [270, 588, 600, 212])).withContext("arcade").toBeGreaterThan(0.02);
    expect(inHouse(canvas, [270, 800, 600, 240])).withContext("cellar and footing").toBeGreaterThan(0.02);
    expect(inHouse(canvas, [100, 170, 100, 870])).withContext("dimension line").toBeGreaterThan(0.02);
  });

  it("leaves the ground clear and keeps the whole drawing inside its view", () => {
    const canvas = houseAlone(HOUSE_VIEW.width);
    const { x, y, width, height } = HOUSE_VIEW;
    const edge = 4;

    expect(inHouse(canvas, [x, y, width, edge])).toBe(0);
    expect(inHouse(canvas, [x, y + height - edge, width, edge])).toBe(0);
    expect(inHouse(canvas, [x, y, edge, height])).toBe(0);
    expect(inHouse(canvas, [x + width - edge, y, edge, height])).toBe(0);
  });

  it("letters no notes and draws no leaders: the page does that in its own text", () => {
    const canvas = houseAlone(HOUSE_VIEW.width);

    expect(inHouse(canvas, [945, 300, 39, 780])).toBe(0);
  });

  it("is the same house as on the sheet", () => {
    const sheet = document.createElement("canvas");
    drawSectionPlate(sheet, []);
    const alone = houseAlone(HOUSE_VIEW.width);
    const walls = [230, 160, 600, 890];

    expect(inHouse(alone, walls)).toBeCloseTo(share(sheet, walls, onPaper), 2);
  });

  it("draws the same thing again when asked again", () => {
    const canvas = houseAlone(300);
    const first = canvas.toDataURL();
    drawHouse(canvas, 300);

    expect(canvas.toDataURL()).toBe(first);
  });

  it("copes with having no width at all", () => {
    expect(() => houseAlone(0)).not.toThrow();
    expect(houseAlone(0).width).toBe(0);
  });
});

describe("drawSectionPlate", () => {
  it("makes any canvas the full sheet, unchanged in size", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    drawSectionPlate(canvas, STOREYS);

    expect([SHEET.width, SHEET.height]).toEqual([2048, 1280]);
    expect([canvas.width, canvas.height]).toEqual([2048, 1280]);
  });

  it("covers the sheet with paper and letters the notes the house alone leaves out", () => {
    const canvas = document.createElement("canvas");
    drawSectionPlate(canvas, STOREYS);
    const corner = canvas.getContext("2d")!.getImageData(2, 2, 1, 1).data;

    expect(Array.from(corner)).toEqual([0x17, 0x17, 0x1b, 255]);
    expect(share(canvas, [1000, 300, 900, 760], onPaper)).toBeGreaterThan(0);
  });
});

describe("NOTE_LEADERS", () => {
  const { x, y, width, height } = HOUSE_VIEW;

  it("has one leader per storey, each lower than the last", () => {
    const rows = NOTE_LEADERS.map((leader) => leader.row);

    expect(rows.length).toBe(4);
    expect([...rows].sort((a, b) => a - b)).toEqual(rows);
    expect(rows[0]).toBeCloseTo((420 - y) / height, 6);
  });

  it("runs every leader from the house to the view's right-hand side without leaving the view", () => {
    for (const { line, row } of NOTE_LEADERS) {
      const [start, end] = [line[0], line[line.length - 1]];

      expect(start[0]).toBeLessThan(900);
      expect(end[0]).toBeGreaterThan(x + width - 10);
      expect(end[1]).toBeCloseTo(y + row * height, 6);
      for (const [px, py] of line) {
        expect(px).toBeGreaterThanOrEqual(x);
        expect(px).toBeLessThanOrEqual(x + width);
        expect(py).toBeGreaterThanOrEqual(y);
        expect(py).toBeLessThanOrEqual(y + height);
      }
    }
  });
});
