import { CanvasTexture, SRGBColorSpace } from "three";

export interface Storey {
  caption: string;
  tools: readonly string[];
}

type Pen = CanvasRenderingContext2D;
type Point = readonly [x: number, y: number];

const SHEET = { width: 2048, height: 1280 } as const;
const INK = {
  paper: "#17171b",
  gold: "#c7a44a",
  faint: "rgba(199, 164, 74, 0.45)",
  bone: "#e8e5de",
  stone: "#8e8b84",
} as const;
/** The house on the sheet, in canvas pixels: its sides, then each level from the roof down. */
const HOUSE = { left: 270, right: 870, apex: 170, eaves: 280, floor: 560, ground: 800, cellar: 985, footing: 1040 } as const;
/** Where each storey's note touches the drawing, and the row its lettering sits on. */
const NOTES = [
  { x: HOUSE.right - 34, y: 440, row: 420 },
  { x: HOUSE.right - 34, y: 694, row: 650 },
  { x: HOUSE.right - 34, y: 896, row: 880 },
  { x: HOUSE.right + 24, y: 1012, row: 1075 },
] as const;
const NOTE_X = 1000;

function stroke(pen: Pen, ...points: Point[]): void {
  pen.beginPath();
  points.forEach(([x, y], index) => (index ? pen.lineTo(x, y) : pen.moveTo(x, y)));
  pen.stroke();
}

function hatch(pen: Pen, x: number, y: number, width: number, height: number): void {
  pen.save();
  pen.beginPath();
  pen.rect(x, y, width, height);
  pen.clip();
  pen.strokeStyle = INK.faint;
  pen.lineWidth = 2;
  for (let offset = -height; offset < width; offset += 14) stroke(pen, [x + offset, y + height], [x + offset + height, y]);
  pen.restore();
}

function spaced(pen: Pen, spacing: string): void {
  if ("letterSpacing" in pen) (pen as Pen & { letterSpacing: string }).letterSpacing = spacing;
}

function roof(pen: Pen, middle: number): void {
  const { left, right, apex, eaves } = HOUSE;
  stroke(pen, [left - 36, eaves], [middle, apex], [right + 36, eaves], [left - 36, eaves]);
  pen.strokeRect(left - 36, eaves, right - left + 72, 34);

  pen.save();
  pen.strokeStyle = INK.faint;
  pen.lineWidth = 2.5;
  stroke(pen, [left + 22, eaves - 12], [middle, apex + 30], [right - 22, eaves - 12], [left + 22, eaves - 12]);
  stroke(pen, [left - 36, eaves + 13], [right + 36, eaves + 13]);
  pen.beginPath();
  pen.arc(middle, eaves - 44, 15, 0, Math.PI * 2);
  pen.stroke();
  pen.restore();
}

function colonnade(pen: Pen): void {
  const { left, right, eaves, floor } = HOUSE;
  const top = eaves + 34;
  const columns = 6;
  const step = (right - left - 88) / (columns - 1);

  for (let index = 0; index < columns; index++) {
    const x = left + 44 + index * step;
    pen.strokeRect(x - 22, top, 44, 16);
    pen.strokeRect(x - 22, floor - 16, 44, 16);
    stroke(pen, [x - 13, top + 16], [x - 13, floor - 16]);
    stroke(pen, [x + 13, top + 16], [x + 13, floor - 16]);
  }
  pen.strokeRect(left - 14, floor, right - left + 28, 28);
  hatch(pen, left - 14, floor, right - left + 28, 28);
}

function arcade(pen: Pen): void {
  const { left, right, floor, ground } = HOUSE;
  const top = floor + 28;
  const bays = 4;
  const pier = 30;
  const bay = (right - left - pier * (bays + 1)) / bays;
  const spring = top + 26 + bay / 2;

  stroke(pen, [left, top], [left, ground]);
  stroke(pen, [right, top], [right, ground]);
  for (let index = 0; index < bays; index++) {
    const x = left + pier + index * (bay + pier);
    pen.beginPath();
    pen.moveTo(x, ground);
    pen.lineTo(x, spring);
    pen.arc(x + bay / 2, spring, bay / 2, Math.PI, Math.PI * 2);
    pen.lineTo(x + bay, ground);
    pen.stroke();
  }
}

function cellar(pen: Pen): void {
  const { left, right, ground, cellar: floor, footing } = HOUSE;
  const wall = 20;
  const vaults = 3;
  const span = (right - left - wall * 2) / vaults;

  stroke(pen, [left, ground], [left, floor], [right, floor], [right, ground]);
  stroke(pen, [left + wall, ground], [left + wall, floor - 16], [right - wall, floor - 16], [right - wall, ground]);

  pen.save();
  pen.lineWidth = 2.5;
  for (let index = 0; index < vaults; index++) {
    const from = left + wall + index * span + 12;
    const to = from + span - 24;
    pen.strokeStyle = INK.gold;
    pen.beginPath();
    pen.moveTo(from, ground + 52);
    pen.quadraticCurveTo((from + to) / 2, ground + 8, to, ground + 52);
    pen.stroke();

    for (const shelf of [ground + 92, ground + 127, ground + 160]) {
      pen.strokeStyle = INK.gold;
      stroke(pen, [from, shelf], [to, shelf]);
      pen.strokeStyle = INK.faint;
      for (let x = from + 10; x < to - 4; x += 15) stroke(pen, [x, shelf - 3], [x, shelf - 22]);
    }
  }
  pen.restore();

  pen.strokeRect(left - 50, floor, right - left + 100, footing - floor);
  hatch(pen, left - 50, floor, right - left + 100, footing - floor);
}

function groundLine(pen: Pen): void {
  const { left, right, ground } = HOUSE;
  pen.save();
  pen.lineWidth = 6;
  stroke(pen, [left - 130, ground], [left, ground]);
  stroke(pen, [right, ground], [right + 70, ground]);
  pen.restore();
  hatch(pen, left - 130, ground + 3, 120, 24);
  hatch(pen, right + 10, ground + 3, 60, 24);
}

/** The drawing's one measurement: the whole height, from roof to footing. */
function dimension(pen: Pen): void {
  const { left, apex, footing } = HOUSE;
  const x = left - 110;

  pen.save();
  pen.lineWidth = 2.5;
  stroke(pen, [x, apex], [x, footing]);
  for (const y of [apex, footing]) {
    stroke(pen, [x - 12, y + 12], [x + 12, y - 12]);
    stroke(pen, [x - 26, y], [x + 40, y]);
  }
  pen.translate(x - 30, (apex + footing) / 2);
  pen.rotate(-Math.PI / 2);
  pen.font = '400 30px "JetBrains Mono", monospace';
  pen.fillStyle = INK.gold;
  pen.textAlign = "center";
  spaced(pen, "0.4em");
  pen.fillText("END TO END", 0, 0);
  pen.restore();
}

function note(pen: Pen, storey: Storey, at: (typeof NOTES)[number]): void {
  pen.save();
  pen.lineWidth = 2.5;
  stroke(pen, [at.x, at.y], [NOTE_X - 70, at.y], [NOTE_X - 40, at.row], [NOTE_X - 20, at.row]);
  pen.fillStyle = INK.gold;
  pen.beginPath();
  pen.arc(at.x, at.y, 7, 0, Math.PI * 2);
  pen.fill();

  pen.font = '400 29px "JetBrains Mono", monospace';
  pen.fillStyle = INK.stone;
  spaced(pen, "0.2em");
  pen.fillText(storey.caption.toUpperCase(), NOTE_X, at.row - 20);

  pen.font = '500 58px "Boska", Georgia, serif';
  spaced(pen, "0.01em");
  let x = NOTE_X;
  storey.tools.forEach((tool, index) => {
    if (index) {
      pen.fillStyle = INK.gold;
      pen.fillText("·", x + 16, at.row + 42);
      x += 32 + pen.measureText("·").width;
    }
    pen.fillStyle = INK.bone;
    pen.fillText(tool, x, at.row + 42);
    x += pen.measureText(tool).width;
  });
  pen.restore();
}

function title(pen: Pen): void {
  pen.save();
  pen.font = '400 28px "JetBrains Mono", monospace';
  pen.fillStyle = INK.gold;
  spaced(pen, "0.3em");
  pen.fillText("PLATE I", 110, 1142);
  pen.font = 'italic 400 60px "Boska", Georgia, serif';
  pen.fillStyle = INK.bone;
  spaced(pen, "0px");
  pen.fillText("Section through a web application", 108, 1208);
  pen.restore();
}

/** Room I's drawing: a house cut open, one storey for each layer of an application, lettered in the page's fonts. */
export function sectionPlateTexture(storeys: readonly Storey[]): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET.width;
  canvas.height = SHEET.height;
  const pen = canvas.getContext("2d");

  if (pen) {
    const middle = (HOUSE.left + HOUSE.right) / 2;
    pen.fillStyle = INK.paper;
    pen.fillRect(0, 0, SHEET.width, SHEET.height);
    pen.lineJoin = "round";
    pen.strokeStyle = INK.faint;
    pen.lineWidth = 2;
    pen.strokeRect(34, 34, SHEET.width - 68, SHEET.height - 68);

    pen.strokeStyle = INK.gold;
    pen.lineWidth = 4;
    roof(pen, middle);
    colonnade(pen);
    arcade(pen);
    groundLine(pen);
    cellar(pen);
    dimension(pen);
    storeys.slice(0, NOTES.length).forEach((storey, index) => note(pen, storey, NOTES[index]));
    title(pen);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
