import { computed, signal } from "@angular/core";
import { Room } from "../../../core/place/places";

/** How far into the stride towards a stop in another room the title comes up: the label left behind has scrolled away by then. */
const APPEARS = 0.42;
/** A title runs on time however fast the visitor moves: its fade in, then a second and a half at full strength. */
export const TITLE_FADE_IN_MS = 300;
export const TITLE_HOLD_MS = TITLE_FADE_IN_MS + 1500;
export const TITLE_FADE_OUT_MS = 500;
/** Where the browser does not say that scrolling ended, a walk the page began is given up after this long without a step. */
export const WALK_IDLE_MS = 2500;

/**
 * Decides when a room's title shows over the walk, from the position on the route alone:
 * once for each walk into another room, and never while the visitor stands at a stop.
 */
export class RoomTitleCue {
  private readonly lettered = signal<Room | null>(null);
  private readonly showing = signal(false);
  private readonly awaited = signal(false);

  /** The room titled; it keeps its lettering until the title has faded. */
  readonly room = this.lettered.asReadonly();
  readonly shown = this.showing.asReadonly();
  /** True while a title is up or about to be: no label may show beside it. */
  readonly holdsLabels = computed(() => this.showing() || this.awaited());

  private progress?: number;
  private direction: -1 | 1 = 1;
  /** The stop a walk the page began is bound for. */
  private target?: number;
  private stood?: Room;
  private shownAt = 0;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private clearTimer?: ReturnType<typeof setTimeout>;
  private idleTimer?: ReturnType<typeof setTimeout>;

  /** `rooms` holds the room of every stop, in walking order. */
  constructor(private readonly rooms: readonly Room[]) {}

  /** The page set off for a stop by itself: only that stop's room is titled, however many the walk passes. */
  walkTo(stop: number): void {
    if (this.progress === undefined || !this.rooms[stop]) return;
    this.target = stop;
    this.read();
    this.watchForIdle();
  }

  /** Call with every new position on the route, in stops. The first only says where the visitor stands. */
  follow(progress: number): void {
    if (this.progress === undefined) {
      this.progress = progress;
      this.stood = this.rooms[Math.round(progress)];
      return;
    }
    if (progress !== this.progress) {
      this.direction = progress > this.progress ? 1 : -1;
      // Scrolled the other way: the visitor has taken the walk over
      if (this.target !== undefined && (this.target - progress) * this.direction < 0) this.target = undefined;
    }
    this.progress = progress;
    this.read();
    if (this.target !== undefined) this.watchForIdle();
  }

  /** The page has come to rest: a walk it began is over, wherever it got to. */
  settle(): void {
    if (this.progress === undefined) return;
    clearTimeout(this.idleTimer);
    this.target = undefined;
    this.read();
  }

  dispose(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.clearTimer);
    clearTimeout(this.idleTimer);
  }

  private read(): void {
    const progress = this.progress ?? 0;
    const heading = this.target ?? (this.direction > 0 ? Math.ceil(progress) : Math.floor(progress));
    const left = Math.abs(heading - progress);
    const room = this.rooms[heading];
    const walked = this.target !== undefined;
    // The hall has no numeral and gets no title
    const entering = room !== this.stood && room.numeral !== "";
    const near = left <= 1 - APPEARS;
    this.awaited.set(entering && walked && !near);
    // The page's own walk can cross its last stride between two frames; its title is then shown on arrival
    if (entering && near && (walked || left > 0)) this.show(room);
    if (!entering || !near || left === 0) this.hide();
    if (left === 0) {
      this.stood = room;
      this.target = undefined;
      clearTimeout(this.idleTimer);
    }
  }

  private show(room: Room): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.clearTimer);
    this.hideTimer = undefined;
    if (this.showing() && this.lettered() === room) return;
    this.lettered.set(room);
    this.showing.set(true);
    this.shownAt = Date.now();
  }

  private hide(): void {
    if (!this.showing() || this.hideTimer !== undefined) return;
    const remaining = TITLE_HOLD_MS - (Date.now() - this.shownAt);
    if (remaining <= 0) this.fade();
    else this.hideTimer = setTimeout(() => this.fade(), remaining);
  }

  private fade(): void {
    this.hideTimer = undefined;
    this.showing.set(false);
    this.clearTimer = setTimeout(() => this.lettered.set(null), TITLE_FADE_OUT_MS);
  }

  private watchForIdle(): void {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.settle(), WALK_IDLE_MS);
  }
}
