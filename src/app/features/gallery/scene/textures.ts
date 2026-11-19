import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from "three";

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
const PLAQUE = { heading: 96, rule: 146, ruleHalf: 56, linesFrom: 178, foot: 58, inset: 84 } as const;

/**
 * A plaque: a heading in small capitals over a gold rule, then its lines one under another.
 * The band under the rule is cut into `rows` lines; a shorter list sits in the middle of it.
 */
export function plaqueTexture(heading: string, lines: readonly string[], rows: number, aspect: number): CanvasTexture {
  return boardTexture(1024, aspect, (context, width, height) => {
    const fit = width - PLAQUE.inset * 2;
    const band = Math.max(rows, 1);

    context.font = '400 54px "JetBrains Mono", monospace';
    context.fillStyle = "#d9b85c";
    spaced(context, "0.08em");
    context.fillText(heading.toUpperCase(), width / 2, PLAQUE.heading, fit);
    context.fillRect(width / 2 - PLAQUE.ruleHalf, PLAQUE.rule, PLAQUE.ruleHalf * 2, 3);

    const shown = lines.slice(0, band);
    const pitch = (height - PLAQUE.linesFrom - PLAQUE.foot) / band;
    const first = PLAQUE.linesFrom + ((band - shown.length) * pitch) / 2;
    context.font = `500 ${Math.round(Math.min(pitch * 0.78, 140))}px "Boska", Georgia, serif`;
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

/** Numbers from 0 to 1 that come out the same on every visit, so a drawn surface never changes between loads. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function tilingTexture(width: number, height: number, paint: Paint): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (context) paint(context, width, height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Straight-grained walnut, the grain running up the canvas. */
export function walnutTexture(): CanvasTexture {
  return tilingTexture(256, 512, (context, width, height) => {
    const random = seeded(11);
    context.fillStyle = "#5e3d28";
    context.fillRect(0, 0, width, height);

    for (let streak = 0; streak < 120; streak++) {
      const x = random() * width;
      const sway = 1 + random() * 3.5;
      // Whole waves only, so the top of a streak meets its own foot where the texture repeats
      const waves = 1 + Math.floor(random() * 2);
      const phase = random() * Math.PI * 2;
      // A few broad, faint bands give the board its figure; the rest are fine lines of grain
      const broad = streak < 14;
      const dark = broad || random() < 0.62;
      const strength = broad ? 0.05 + random() * 0.06 : dark ? 0.06 + random() * 0.16 : 0.04 + random() * 0.08;
      context.strokeStyle = dark ? `rgba(34, 18, 9, ${strength})` : `rgba(170, 118, 74, ${strength})`;
      context.lineWidth = broad ? 10 + random() * 22 : 0.6 + random() * 1.8;

      for (const wrap of [-width, 0, width]) {
        context.beginPath();
        for (let y = 0; y <= height; y += 16) {
          context.lineTo(x + wrap + Math.sin((y / height) * Math.PI * 2 * waves + phase) * sway, y);
        }
        context.stroke();
      }
    }
  });
}

/**
 * The soft sheen of brushed metal, to multiply over the metal's own colour: a band of light below the
 * top of each face, and strokes too fine to count. The scene has nothing for metal to reflect, so the sheen is drawn.
 */
export function brushedTexture(): CanvasTexture {
  return tilingTexture(64, 256, (context, width, height) => {
    const sheen = context.createLinearGradient(0, 0, 0, height);
    sheen.addColorStop(0, "#d9d9d9");
    sheen.addColorStop(0.2, "#ffffff");
    sheen.addColorStop(0.5, "#d4d4d4");
    sheen.addColorStop(1, "#b2b2b2");
    context.fillStyle = sheen;
    context.fillRect(0, 0, width, height);

    const random = seeded(23);
    for (let y = 0; y < height; y++) {
      context.fillStyle = random() < 0.5 ? `rgba(255, 255, 255, ${random() * 0.07})` : `rgba(0, 0, 0, ${random() * 0.07})`;
      context.fillRect(0, y, width, 1);
    }
  });
}

/** A fabric lampshade with the lamp lit inside it: brightest around the bulb, dimmer at both rims. The canvas's bottom edge is the shade's foot. */
export function lampshadeTexture(): CanvasTexture {
  return tilingTexture(128, 128, (context, width, height) => {
    const lit = context.createLinearGradient(0, height, 0, 0);
    lit.addColorStop(0, "#b9813c");
    lit.addColorStop(0.12, "#e9bb6c");
    lit.addColorStop(0.42, "#ffe7b0");
    lit.addColorStop(0.78, "#e2ad5e");
    lit.addColorStop(1, "#a9753a");
    context.fillStyle = lit;
    context.fillRect(0, 0, width, height);

    const random = seeded(5);
    for (let x = 0; x < width; x += 2) {
      context.fillStyle = `rgba(120, 70, 20, ${0.03 + random() * 0.09})`;
      context.fillRect(x, 0, 1, height);
    }
  });
}

export function writtenPageTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 352;

  const context = canvas.getContext("2d");
  if (context) {
    const random = seeded(41);
    context.fillStyle = "#d8d2c3";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(40, 33, 26, 0.8)";
    context.lineWidth = 2;
    context.lineCap = "round";
    for (let line = 0; line < 9; line++) {
      const y = 62 + line * 28;
      const end = line === 8 ? 120 : 190 + random() * 34;
      let x = line === 0 ? 34 : 30 + random() * 6;
      while (x < end) {
        const word = Math.min(10 + random() * 26, end - x + 4);
        context.beginPath();
        context.moveTo(x, y);
        for (let step = 4; step <= word; step += 4) context.lineTo(x + step, y + (random() - 0.5) * 5);
        context.stroke();
        x += word + 7;
      }
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Where a room's name sits on its canvas: the numeral, the rule under it and the name, by their middles. */
const ROOM_NAME = { width: 1536, height: 640, numeral: 150, rule: 282, ruleHalf: 62, name: 438 } as const;
/** The canvas's width over its height; the surface it is mapped on keeps to it. */
export const ROOM_NAME_ASPECT = ROOM_NAME.width / ROOM_NAME.height;

export function roomNameTexture(numeral: string, name: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = ROOM_NAME.width;
  canvas.height = ROOM_NAME.height;

  const context = canvas.getContext("2d");
  if (context) {
    const { width } = canvas;
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.font = '400 132px "JetBrains Mono", monospace';
    context.fillStyle = "#c7a44a";
    spaced(context, "0.14em");
    // Letter spacing trails the last letter too, which would set the numeral left of the rule
    context.fillText(numeral.toUpperCase(), width / 2 + 132 * 0.07, ROOM_NAME.numeral, width - 160);
    context.fillRect(width / 2 - ROOM_NAME.ruleHalf, ROOM_NAME.rule, ROOM_NAME.ruleHalf * 2, 5);

    context.font = '500 196px "Boska", Georgia, serif';
    context.fillStyle = "#e8e5de";
    spaced(context, "0.01em");
    context.fillText(name, width / 2, ROOM_NAME.name, width - 80);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
