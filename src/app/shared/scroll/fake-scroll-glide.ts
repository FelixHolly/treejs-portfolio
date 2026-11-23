import { GlideOutcome, ScrollGlide } from "./scroll-glide";

interface Run {
  target: () => number;
  onStep?: (top: number) => void;
  end: (outcome: GlideOutcome) => void;
}

/** A glide the specs move by hand: it takes no time and never touches the window. */
export class FakeScrollGlide implements Pick<ScrollGlide, "active" | "to" | "cancel"> {
  private run?: Run;

  get active(): boolean {
    return this.run !== undefined;
  }

  /** Where the glide under way is bound, asked afresh as the real one asks every frame. */
  get target(): number | undefined {
    return this.run?.target();
  }

  to(target: () => number, onStep?: (top: number) => void): Promise<GlideOutcome> {
    this.cancel();
    return new Promise((end) => (this.run = { target, onStep, end }));
  }

  cancel(): void {
    this.finish("interrupted");
  }

  /** One frame of the glide under way, at the position the spec says it has reached. */
  step(top: number): void {
    this.underWay().onStep?.(top);
  }

  /** The last frame: on the target, or at `top` where the page's end stopped the glide short of it. Resolves once the page has heard. */
  async arrive(top = this.underWay().target()): Promise<void> {
    this.step(top);
    this.finish("arrived");
    await Promise.resolve();
  }

  /** The visitor took over; resolves once the page has heard of it. */
  async interrupt(): Promise<void> {
    this.underWay();
    this.finish("interrupted");
    await Promise.resolve();
  }

  /** A spec that moves a glide the page never began has lost its footing, and fails where it stands. */
  private underWay(): Run {
    if (!this.run) throw new Error("No glide is under way");
    return this.run;
  }

  private finish(outcome: GlideOutcome): void {
    const run = this.run;
    this.run = undefined;
    run?.end(outcome);
  }
}
