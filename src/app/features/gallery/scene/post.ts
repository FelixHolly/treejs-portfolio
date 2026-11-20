import { Group, MathUtils, Vector3 } from "three";
import { Palette } from "./building";
import { envelope } from "./exhibits";
import { DESK_TOP } from "./furniture";
import { HANG_Z, LETTERBOX } from "./layout";

const FLIGHT_MS = 1700;
/** The share of the flight spent rising to the slot; the rest slides the envelope in. */
const RISE = 0.72;
/** Where the envelope lies on the desk, in the desk's own coordinates, and how it is turned there. */
const AT_REST = { x: 0.34, y: DESK_TOP + 0.005, z: 0.16, turn: 0.3 } as const;

/** The envelope on the writing desk, and its flight into the letterbox when a letter is sent. */
export class Post {
  readonly envelope: Group;
  private readonly rest: Vector3;
  private readonly restTurn: number;
  private readonly peak: Vector3;
  private readonly mouth = new Vector3(
    LETTERBOX.x,
    LETTERBOX.y + LETTERBOX.slotRise,
    HANG_Z + LETTERBOX.depth + 0.14,
  );
  private start: number | null = null;

  constructor(palette: Palette, desk: Group) {
    desk.updateMatrixWorld();
    this.rest = desk.localToWorld(new Vector3(AT_REST.x, AT_REST.y, AT_REST.z));
    this.restTurn = desk.rotation.y + AT_REST.turn;
    this.peak = new Vector3(
      (this.rest.x + this.mouth.x) / 2,
      this.mouth.y + 0.3,
      Math.max(this.rest.z, this.mouth.z) + 0.25,
    );
    this.envelope = envelope(palette);
    this.settle();
  }

  /** Posts the envelope; with `instant` it is simply gone, for visitors who asked for less motion. */
  send(now: number, instant: boolean): void {
    this.settle();
    if (instant) {
      this.envelope.visible = false;
    } else {
      this.start = now;
    }
  }

  /** Moves the envelope along its flight. Returns true while it is still in the air. */
  update(now: number): boolean {
    if (this.start === null) return false;
    const t = Math.min((now - this.start) / FLIGHT_MS, 1);
    const rise = MathUtils.smootherstep(t / RISE, 0, 1);
    const slide = MathUtils.smootherstep((t - RISE) / (1 - RISE), 0, 1);

    // A curve from the desk over `peak` to the slot, then straight in
    const position = this.envelope.position;
    position.copy(this.rest).multiplyScalar((1 - rise) * (1 - rise));
    position.addScaledVector(this.peak, 2 * rise * (1 - rise)).addScaledVector(this.mouth, rise * rise);
    position.z -= slide * (LETTERBOX.depth + 0.14);
    this.envelope.rotation.y = this.restTurn * (1 - rise);

    if (t >= 1) {
      this.envelope.visible = false;
      this.start = null;
    }
    return t < 1;
  }

  private settle(): void {
    this.start = null;
    this.envelope.visible = true;
    this.envelope.position.copy(this.rest);
    this.envelope.rotation.set(0, this.restTurn, 0);
  }
}
