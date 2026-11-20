import { BufferGeometry, Vector3 } from "three";

export interface Corner {
  at: Vector3;
  normal: Vector3;
  /** Linear red, green and blue; black where the geometry carries no colours. */
  tone: readonly [number, number, number];
}

/** How light a linear colour is, as the contrast rules weigh it. */
export function luminance([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Every corner of every triangle of a geometry that is not indexed, with single-precision noise rounded off. */
export function corners(geometry: BufferGeometry): Corner[] {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const color = geometry.getAttribute("color");
  // Adding nothing turns a minus zero into a plain one, which a spec would otherwise tell apart
  const exact = (value: number) => Math.round(value * 1e5) / 1e5 + 0;
  return Array.from({ length: position.count }, (_, index) => ({
    at: new Vector3(exact(position.getX(index)), exact(position.getY(index)), exact(position.getZ(index))),
    normal: normal ? new Vector3(exact(normal.getX(index)), exact(normal.getY(index)), exact(normal.getZ(index))) : new Vector3(),
    tone: color ? [color.getX(index), color.getY(index), color.getZ(index)] : [0, 0, 0],
  }));
}
