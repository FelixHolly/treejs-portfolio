import { CanvasTexture, SRGBColorSpace, Texture } from "three";

export interface Inscription {
  text: string;
  font: string;
  color: string;
  /** Canvas size in pixels; the plane it is mapped on sets the real-world size. */
  width: number;
  height: number;
  spacing?: string;
}

/** Lettering for the walls, drawn with the page's own fonts so it matches the HTML. */
export function inscriptionTexture(inscription: Inscription): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = inscription.width;
  canvas.height = inscription.height;

  const context = canvas.getContext("2d");
  if (context) {
    context.font = inscription.font;
    context.fillStyle = inscription.color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    if ("letterSpacing" in context) {
      (context as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = inscription.spacing ?? "0px";
    }
    context.fillText(inscription.text, canvas.width / 2, canvas.height / 2, canvas.width * 0.96);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

type Paint = (context: CanvasRenderingContext2D, width: number, height: number) => void;

function spaced(context: CanvasRenderingContext2D, spacing: string): void {
  if ("letterSpacing" in context) {
    (context as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = spacing;
  }
}

/** A dark board with a fine gold line inside its edge, `width` pixels wide, for `paint` to letter. */
function boardTexture(width: number, aspect: number, paint: Paint): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round(width / aspect);

  const context = canvas.getContext("2d");
  if (context) {
    const { height } = canvas;
    context.fillStyle = "#17171b";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(199, 164, 74, 0.5)";
    context.lineWidth = 3;
    context.strokeRect(26, 26, width - 52, height - 52);
    context.textAlign = "center";
    context.textBaseline = "middle";
    paint(context, width, height);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Names in gold on a dark board, one to a line; `aspect` is the board's width over its height. */
export function nameBoardTexture(names: readonly string[], aspect: number): CanvasTexture {
  return boardTexture(1536, aspect, (context, width, height) => {
    const pitch = (height - 120) / names.length;
    context.font = `500 ${Math.round(Math.min(pitch * 0.5, 132))}px "Boska", Georgia, serif`;
    context.fillStyle = "#d9b85c";
    spaced(context, "0.22em");
    names.forEach((name, index) => {
      context.fillText(name.toUpperCase(), width / 2, 60 + pitch * (index + 0.5) + 6, width - 180);
    });
  });
}

/** Where a plaque's parts sit on its 1024 pixel wide canvas: the heading, the rule under it, and the band the lines share. */
const PLAQUE = { heading: 150, rule: 222, ruleHalf: 64, linesFrom: 270, foot: 96, inset: 84 } as const;

/**
 * A plaque: a heading in small capitals over a gold rule, then its lines one under another.
 * The band under the rule is cut into `rows` lines; a shorter list sits in the middle of it.
 */
export function plaqueTexture(heading: string, lines: readonly string[], rows: number, aspect: number): CanvasTexture {
  return boardTexture(1024, aspect, (context, width, height) => {
    const fit = width - PLAQUE.inset * 2;
    const band = Math.max(rows, 1);

    context.font = '400 60px "JetBrains Mono", monospace';
    context.fillStyle = "#d9b85c";
    spaced(context, "0.08em");
    context.fillText(heading.toUpperCase(), width / 2, PLAQUE.heading, fit);
    context.fillRect(width / 2 - PLAQUE.ruleHalf, PLAQUE.rule, PLAQUE.ruleHalf * 2, 3);

    const shown = lines.slice(0, band);
    const pitch = (height - PLAQUE.linesFrom - PLAQUE.foot) / band;
    const first = PLAQUE.linesFrom + ((band - shown.length) * pitch) / 2;
    context.font = `500 ${Math.round(Math.min(pitch * 0.62, 140))}px "Boska", Georgia, serif`;
    context.fillStyle = "#e8e5de";
    spaced(context, "0.01em");
    shown.forEach((line, index) => {
      context.fillText(line, width / 2, first + pitch * (index + 0.5), fit);
    });
  });
}

/** Crops a texture to a plane's proportions like CSS `object-fit: cover`, keeping the top of the image. */
export function coverFit(texture: Texture, planeAspect: number, imageAspect = aspectOf(texture)): void {
  if (imageAspect > planeAspect) {
    texture.repeat.set(planeAspect / imageAspect, 1);
    texture.offset.set((1 - texture.repeat.x) / 2, 0);
  } else {
    texture.repeat.set(1, imageAspect / planeAspect);
    texture.offset.set(0, 1 - texture.repeat.y);
  }
}

function aspectOf(texture: Texture): number {
  const image = texture.image as { width: number; height: number };
  return image.width / image.height;
}
