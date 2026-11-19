import { CanvasTexture, SRGBColorSpace } from "three";
import { drawSectionPlate, Storey } from "../../../shared/section-plate/draw-section-plate";

/** Room I's drawing: a house cut open, one storey for each layer of an application, lettered in the page's fonts. */
export function sectionPlateTexture(storeys: readonly Storey[]): CanvasTexture {
  const canvas = document.createElement("canvas");
  drawSectionPlate(canvas, storeys);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
