/** What the renderer may spend on a frame. */
export interface QualityTier {
  /** The most device pixels drawn per CSS pixel. */
  readonly pixelRatio: number;
  readonly statueShadow: boolean;
  /** The floor mirrors the room: a second drawing of the scene on every frame. */
  readonly reflections: boolean;
}

/** From best to cheapest: the floor stops mirroring, the pixel ratio comes down, then the statue loses its shadow. */
export const QUALITY_LADDER: readonly QualityTier[] = [
  { pixelRatio: 2, statueShadow: true, reflections: true },
  { pixelRatio: 2, statueShadow: true, reflections: false },
  { pixelRatio: 1.5, statueShadow: true, reflections: false },
  { pixelRatio: 1.25, statueShadow: true, reflections: false },
  { pixelRatio: 1, statueShadow: true, reflections: false },
  { pixelRatio: 1, statueShadow: false, reflections: false },
];

/** Slower than this on average and quality steps down: on a 60 Hz screen about one frame in three is late. */
const STEP_DOWN_MS = 22;
/** Still slower than this at the lowest tier and the visitor is told. */
const TOO_SLOW_MS = 35;
/** A display slower than 60 Hz is allowed the same share of late frames, measured against its own pace. */
const LATE = 1.3;
/** What a judgement rests on: this long with the scene running, and at least this many frames. */
const WINDOW = { seconds: 1, frames: 8 } as const;
/** Frames left out after a rest, an upload or a step: they pay for the change, not for the scene. */
const SETTLE_FRAMES = 4;
/** One frame counts for no more than this, or a single stall would fill the window by itself. */
const STALL_SECONDS = 0.25;
/** A lower ratio is worth a step only if it drops at least 15% of the pixels. */
const WORTH_A_STEP = 0.92;

/** Steps quality down when frames take too long while the scene runs. It never steps back up. */
export class QualityController {
  private index: number;
  private frames: number[] = [];
  private total = 0;
  private settling = SETTLE_FRAMES;
  private told = false;
  private readonly beats: number[] = [];

  constructor(
    private readonly ladder: readonly QualityTier[],
    startAt: number,
    private readonly onStep: (tier: QualityTier) => void,
    private readonly onTooSlow: () => void,
  ) {
    this.index = Math.min(Math.max(startAt, 0), ladder.length - 1);
  }

  get tier(): QualityTier {
    return this.ladder[this.index];
  }

  /** True only at the top tier: a costly extra such as a reflective floor is the first thing to go. */
  get allowsCostlyEffects(): boolean {
    return this.tier.reflections;
  }

  /** Takes the seconds between two frames of the display in which nothing was drawn: a pace no quality can beat. */
  displayFrame(seconds: number): void {
    this.beats.push(seconds);
    this.beats.sort((a, b) => a - b);
  }

  /** Call when the next frames say nothing about the pace: after a rest, a pause, a resize or an upload. */
  settle(): void {
    this.settling = SETTLE_FRAMES;
  }

  /** Takes the seconds a frame took at `pixelRatio`, for frames that followed one another without a rest. */
  frame(seconds: number, pixelRatio: number): void {
    if (this.told) return;
    if (this.settling > 0) {
      this.settling -= 1;
      return;
    }

    const counted = Math.min(seconds, STALL_SECONDS);
    this.frames.push(counted);
    this.total += counted;
    while (this.frames.length > WINDOW.frames && this.total - this.frames[0] >= WINDOW.seconds) {
      this.total -= this.frames[0];
      this.frames.shift();
    }
    if (this.frames.length < WINDOW.frames || this.total < WINDOW.seconds) return;

    // One long frame is a hitch, not a pace
    const pace = ((this.total - Math.max(...this.frames)) / (this.frames.length - 1)) * 1000;
    // The second shortest, so that one stray beat does not pass for the display's pace
    const displayMs = (this.beats[1] ?? 0) * 1000;
    if (this.index === this.ladder.length - 1) {
      if (pace > Math.max(TOO_SLOW_MS, LATE * displayMs)) {
        this.told = true;
        this.onTooSlow();
      }
      return;
    }
    const late = Math.max(STEP_DOWN_MS, LATE * displayMs);
    if (pace <= late) return;

    this.index = this.stepFrom(pixelRatio * Math.sqrt(late / pace), pixelRatio);
    this.frames = [];
    this.total = 0;
    this.settling = SETTLE_FRAMES;
    this.onStep(this.tier);
  }

  /**
   * A frame's time follows its pixel count, so the pace tells which ratio is `affordable` and how many tiers to drop
   * at once. Tiers that would not lower the `drawn` ratio are passed over; the shadow goes only when no ratio is left.
   */
  private stepFrom(affordable: number, drawn: number): number {
    const last = this.ladder.length - 1;
    let next = this.index + 1;
    // What the mirror costs is not known, so it goes alone and the pace without it is measured before any ratio goes
    if (this.tier.reflections && !this.ladder[next].reflections) return next;
    while (next < last) {
      const { pixelRatio } = this.ladder[next];
      const lowestRatio = !this.ladder[next + 1].statueShadow;
      if (pixelRatio <= drawn * WORTH_A_STEP && (pixelRatio <= affordable || lowestRatio)) break;
      next += 1;
    }
    return next;
  }
}
