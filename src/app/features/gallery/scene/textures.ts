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

/** Names in gold on a dark board, one to a line; `aspect` is the board's width over its height. */
export function nameBoardTexture(names: readonly string[], aspect: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = Math.round(canvas.width / aspect);

  const context = canvas.getContext("2d");
  if (context) {
    const { width, height } = canvas;
    context.fillStyle = "#17171b";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(199, 164, 74, 0.5)";
    context.lineWidth = 3;
    context.strokeRect(26, 26, width - 52, height - 52);

    const pitch = (height - 120) / names.length;
    context.font = `500 ${Math.round(Math.min(pitch * 0.5, 132))}px "Boska", Georgia, serif`;
    context.fillStyle = "#d9b85c";
    context.textAlign = "center";
    context.textBaseline = "middle";
    if ("letterSpacing" in context) {
      (context as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0.22em";
    }
    names.forEach((name, index) => {
      context.fillText(name.toUpperCase(), width / 2, 60 + pitch * (index + 0.5) + 6, width - 180);
    });
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Crops a texture to a plane's proportions like CSS `object-fit: cover`, keeping the top of the image. */
export function coverFit(texture: Texture, planeAspect: number): void {
  const image = texture.image as { width: number; height: number };
  const imageAspect = image.width / image.height;

  if (imageAspect > planeAspect) {
    texture.repeat.set(planeAspect / imageAspect, 1);
    texture.offset.set((1 - texture.repeat.x) / 2, 0);
  } else {
    texture.repeat.set(1, imageAspect / planeAspect);
    texture.offset.set(0, 1 - texture.repeat.y);
  }
}
