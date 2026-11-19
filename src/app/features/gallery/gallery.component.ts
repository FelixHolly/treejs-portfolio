import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
  DOCUMENT
} from "@angular/core";

import { Title } from "@angular/platform-browser";
import { RouterLink } from "@angular/router";
import { environment } from "../../../environments/environment";
import { DEVELOPER } from "../../core/content/developer.content";
import { VISITOR_ENTRIES } from "../../core/content/visitors-book.content";
import { KIND_LABEL, Work } from "../../core/content/work.model";
import { WorksService } from "../../core/content/works.service";
import { BASE_TITLE, placeFromHash, titleFor } from "../../core/place/places";
import { PlaceService } from "../../core/place/place.service";
import { ViewEnvironment } from "../../core/view-mode/view-environment";
import { ViewModeService } from "../../core/view-mode/view-mode.service";
import { ArrowDownIconComponent } from "../../shared/icons/arrow-down.icon";
import { LetterComponent } from "../../shared/letter/letter.component";
import { RoomLabelComponent } from "../../shared/room-label/room-label.component";
import { ViewSwitchComponent } from "../../shared/view-switch/view-switch.component";
import { WallLabelComponent } from "../../shared/wall-label/wall-label.component";
import { FloorPlanComponent } from "./floor-plan/floor-plan.component";
import { GALLERY_SCENE_FACTORY } from "./gallery-scene.factory";
import { LightboxComponent } from "./lightbox/lightbox.component";
import { GalleryView, OPEN_BAND, PageFraming } from "./scene/gallery-view";
import { labelShareOf, LabelSpan, neighbourStop, progressFromScroll, scrollTargetFor } from "./scroll-progress";
import { buildStops, GalleryStop } from "./stops";

/** Room the fixed header needs above a label that is taller than the screen. */
const HEADER_CLEARANCE = 84;
const CROSS_FADE_MS = 260;
/** How far along the first stride the entrance's own text gives way to the walk. */
const SET_OFF = 0.08;
/** Air kept between the statue and the entrance text above and below it, in pixels. */
const STATUE_CLEARANCE = { above: 22, below: 8 } as const;
/** How far either side of the screen's middle the statue reaches, as a share of the screen's height. */
const STATUE_HALF_WIDTH = 0.2;
/** Breathing room kept between a piece and the label beside it, in pixels. */
const SIDE_GUTTER = 24;
/** Keys must not step the walk while the visitor is typing or operating a control. */
const INTERACTIVE = "input, textarea, select, button, a, dialog, [contenteditable]";
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

/** Empty at the entrance, which has its own plaque for this, and at the last stop, which leads nowhere. */
function onwardText(stops: readonly GalleryStop[], index: number): string {
  const next = stops[index + 1];
  if (index === 0 || !next) return "";
  if (next.work) return `Next: ${next.work.title}`;
  // A stop further along the same room goes by its own name; the room's was said on the way in
  return next.title && next.room === stops[index].room
    ? `Continue to ${next.title}`
    : `Continue to Room ${next.room.numeral}, ${next.room.name}`;
}

function sameFraming(a: PageFraming, b: PageFraming): boolean {
  return a.labelShare === b.labelShare && a.statueBand[0] === b.statueBand[0] && a.statueBand[1] === b.statueBand[1];
}

@Component({
  selector: "app-gallery",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ArrowDownIconComponent,
    FloorPlanComponent,
    LetterComponent,
    LightboxComponent,
    RoomLabelComponent,
    ViewSwitchComponent,
    WallLabelComponent,
  ],
  templateUrl: "./gallery.component.html",
  styleUrl: "./gallery.component.scss",
})
export class GalleryComponent {
  private readonly document = inject(DOCUMENT);
  private readonly place = inject(PlaceService);
  private readonly viewMode = inject(ViewModeService);
  private readonly createScene = inject(GALLERY_SCENE_FACTORY);
  private readonly environment = inject(ViewEnvironment);
  private readonly reducedMotion = this.environment.prefersReducedMotion();
  private readonly works = inject(WorksService).works();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  private readonly main = viewChild.required<ElementRef<HTMLElement>>("main");
  private readonly lightbox = viewChild.required(LightboxComponent);

  readonly stops = buildStops(this.works);
  readonly last = this.stops.length - 1;
  readonly onward = this.stops.map((_, index) => onwardText(this.stops, index));
  readonly developer = DEVELOPER;
  readonly entries = VISITOR_ENTRIES;
  readonly year = new Date().getFullYear();
  readonly worksSummary = this.summarise();
  readonly kindLabel = KIND_LABEL;
  /** Nothing plays by itself for a visitor who asked for less motion or is saving data. */
  private readonly filmsAllowed = !this.reducedMotion && !this.environment.savesData();
  /** The scene plays one film, the first work's that has one; only that work's label carries the control. */
  private readonly filmSlug = this.filmsAllowed ? this.works.find((work) => work.film)?.slug : undefined;

  readonly activeIndex = signal(0);
  /** True while the scene cuts between stops for visitors who asked for reduced motion. */
  readonly fading = signal(false);
  readonly slow = signal(false);
  /** True once the visitor has walked on from the entrance, so its plaques stop floating over the walk. */
  readonly setOff = signal(false);
  readonly filmPaused = signal(false);
  private readonly filmLost = signal(false);
  readonly filmControlFor = computed(() => (this.filmLost() ? undefined : this.filmSlug));
  readonly currentRoom = computed(() => this.stops[this.activeIndex()].room);
  readonly announcement = computed(() => {
    const { room, title } = this.stops[this.activeIndex()];
    const where = room.numeral ? `Room ${room.numeral}, ${room.name}` : room.name;
    return title ? `${where}, ${title}` : where;
  });

  private spans: LabelSpan[] = [];
  private progress = 0;
  private scene?: GalleryView;
  private fadeTarget = 0;
  private fadeTimer = 0;
  private framing: PageFraming = { labelShare: 0, statueBand: OPEN_BAND };

  constructor() {
    this.viewMode.active.set("gallery");
    const destroyRef = inject(DestroyRef);
    const title = inject(Title);
    const workTitles = Object.fromEntries(this.works.map((work) => [work.slug, work.title]));
    effect(() => title.setTitle(titleFor(this.place.current(), workTitles)));
    // The privacy page sets no title of its own
    destroyRef.onDestroy(() => title.setTitle(BASE_TITLE));
    afterNextRender(() => this.start(destroyRef));
  }

  /** Walks to a stop; with `focus` the stop's heading takes keyboard focus as the walk sets off. */
  goTo(index: number, focus = false): void {
    if (focus) this.remember(index);
    this.scrollToStop(index, "smooth");
    if (focus) this.focusHeading(index);
  }

  skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  visit(place: string): void {
    const index = this.stops.findIndex((stop) => stop.place === place);
    if (index >= 0) this.goTo(index, true);
  }

  letterPosted(): void {
    this.scene?.post();
  }

  closerLook(work: Work): void {
    this.lightbox().open(work);
    this.holdFilm();
  }

  toggleFilm(): void {
    this.filmPaused.update((paused) => !paused);
    this.holdFilm();
  }

  /** The closer look has the film with its own controls; two should not run at once. */
  holdFilm(): void {
    this.scene?.setFilmHeld(this.filmPaused() || this.lightbox().work() !== null);
  }

  private start(destroyRef: DestroyRef): void {
    const window = this.document.defaultView;
    if (!window) return;
    const root = this.document.documentElement;
    const main = this.main().nativeElement;
    let destroyed = false;

    this.document.getElementById("shell")?.remove();
    root.classList.add("gallery-active");
    this.measure();
    this.restoreFromHash("instant");
    this.syncFromScroll();
    // The shared place outlives a page: coming back to the entrance must not keep the room last visited
    this.place.current.set(this.stops[this.activeIndex()].place);
    this.fadeTarget = this.activeIndex();

    const onScroll = () => this.syncFromScroll();
    const onResize = () => {
      this.measure();
      this.scene?.resize(this.framing);
      this.syncFromScroll();
    };
    const onKey = (event: KeyboardEvent) => this.onKey(event);
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      this.scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };
    const onHash = () => this.restoreFromHash("smooth");
    const onBack = () => this.restoreFromHash("smooth");
    const onVisibility = () => this.scene?.setPaused(this.document.hidden);
    const onFocus = (event: FocusEvent) => this.followFocus(event);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onBack);
    this.document.addEventListener("visibilitychange", onVisibility);
    main.addEventListener("focusin", onFocus);

    // Labels change height when fonts arrive or the letter shows its errors.
    const resizeObserver = new ResizeObserver(() => {
      const before = this.framing;
      this.measure();
      if (!sameFraming(before, this.framing)) this.scene?.resize(this.framing);
      this.syncFromScroll();
    });
    resizeObserver.observe(main);

    // The name and plaques paint first; the 3D scene is built in the frame after.
    let sceneTimer = 0;
    const sceneFrame = window.requestAnimationFrame(() => {
      sceneTimer = window.setTimeout(() => {
        this.openScene()
          .then((scene) => {
            if (destroyed) {
              scene.dispose();
              return;
            }
            this.scene = scene;
            scene.resize(this.framing);
            scene.jumpTo(this.reducedMotion ? this.activeIndex() : this.progress);
            this.holdFilm();
          })
          .catch(() => {
            if (!destroyed) void this.viewMode.reportBroken();
          });
      });
    });

    destroyRef.onDestroy(() => {
      destroyed = true;
      root.classList.remove("gallery-active");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onBack);
      this.document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(this.fadeTimer);
      window.clearTimeout(sceneTimer);
      window.cancelAnimationFrame(sceneFrame);
      resizeObserver.disconnect();
      this.scene?.dispose();
    });
  }

  private openScene(): Promise<GalleryView> {
    return this.createScene(this.canvas().nativeElement, {
      works: this.works.map((work) => ({
        slug: work.slug,
        kind: work.kind,
        images: work.images.map((image) => ({ src: image.src, portrait: image.orientation === "portrait" })),
        film: work.film?.src,
      })),
      frieze: this.developer.frieze,
      portrait: this.developer.portrait.src,
      visitors: this.entries.map((entry) => entry.company),
      skills: this.developer.skills,
      reducedMotion: this.reducedMotion,
      films: this.filmsAllowed,
      onFilmLost: () => this.filmLost.set(true),
      assets: { dracoPath: environment.assets.dracoPath, lionModel: environment.assets.models.heroModel },
      onSlow: () => this.slow.set(true),
    });
  }

  private measure(): void {
    const scrollY = this.document.defaultView?.scrollY ?? 0;
    const width = this.document.documentElement.clientWidth;
    const height = this.document.defaultView?.innerHeight ?? 0;
    const labels = Array.from(this.main().nativeElement.querySelectorAll<HTMLElement>("[data-label]"));
    const boxes = labels.map((label) => label.getBoundingClientRect());
    this.spans = boxes.map((box) => ({ top: box.top + scrollY, bottom: box.bottom + scrollY }));

    // Scroll snapping rests where the keys and the floor plan land: centred, or under the header when too tall.
    labels.forEach((label, index) => {
      const spare = (height - boxes[index].height) / 2;
      // The page already keeps HEADER_CLEARANCE free above every snap point (scroll-padding-top)
      label.style.scrollMarginTop = `${index === 0 ? 0 : Math.max(spare - HEADER_CLEARANCE, 0)}px`;
    });

    this.framing = {
      labelShare: labelShareOf(boxes[1]?.left, width, SIDE_GUTTER),
      statueBand: this.statueBand(labels[0], width, height),
    };
  }

  /** The stretch of the first screen the statue is framed in: under the name, above whatever lies across its feet. */
  private statueBand(entrance: HTMLElement | undefined, width: number, height: number): PageFraming["statueBand"] {
    const head = entrance?.querySelector(".entrance-head")?.getBoundingClientRect();
    const foot = entrance?.querySelector(".entrance-foot");
    const origin = entrance?.getBoundingClientRect().top ?? 0;
    if (!head || !foot || height <= 0) return OPEN_BAND;

    // Plaques standing either side of the statue leave it room down to the hint; stacked ones stop it sooner.
    const reach = height * STATUE_HALF_WIDTH;
    const tops = Array.from(foot.querySelectorAll<HTMLElement>(".plaques > *, .hint"))
      .map((element) => element.getBoundingClientRect())
      .filter((box) => box.left < width / 2 + reach && box.right > width / 2 - reach)
      .map((box) => box.top);
    const floor = Math.min(...tops, foot.getBoundingClientRect().bottom);
    return [(head.bottom - origin + STATUE_CLEARANCE.above) / height, (floor - origin - STATUE_CLEARANCE.below) / height];
  }

  private syncFromScroll(): void {
    const window = this.document.defaultView;
    if (!window) return;

    this.progress = progressFromScroll(window.scrollY, this.spans, window.innerHeight);
    const index = Math.round(this.progress);
    this.setOff.set(this.progress > SET_OFF);
    if (this.reducedMotion) {
      this.crossFadeTo(index);
    } else {
      this.scene?.setProgress(this.progress);
    }
    if (index !== this.activeIndex()) this.arrive(index);
  }

  private arrive(index: number): void {
    const window = this.document.defaultView;
    const stop = this.stops[index];
    this.activeIndex.set(index);
    this.place.current.set(stop.place);
    // Scrolling past stops only rewrites the current entry; history grows on deliberate jumps alone
    window?.history.replaceState(window.history.state, "", this.urlFor(index));
  }

  /** A deliberate jump leaves a history entry behind, so Back walks to where the visitor came from. */
  private remember(index: number): void {
    const window = this.document.defaultView;
    const stop = this.stops[index];
    if (!window || !stop || index === this.activeIndex()) return;
    window.history.pushState(window.history.state, "", this.urlFor(index));
  }

  private urlFor(index: number): string {
    const location = this.document.location;
    return index === 0 ? location.pathname + location.search : `#${this.stops[index].place}`;
  }

  private crossFadeTo(index: number): void {
    if (index === this.fadeTarget) return;
    const window = this.document.defaultView;
    this.fadeTarget = index;
    this.fading.set(true);
    window?.clearTimeout(this.fadeTimer);
    this.fadeTimer =
      window?.setTimeout(() => {
        this.scene?.jumpTo(index);
        this.fading.set(false);
      }, CROSS_FADE_MS) ?? 0;
  }

  private restoreFromHash(behavior: ScrollBehavior): void {
    const window = this.document.defaultView;
    if (!window) return;
    const place = placeFromHash(
      window.location.hash,
      this.works.map((work) => work.slug),
    );
    // No hash is the entrance, which is where Back lands after the first jump
    const index = window.location.hash.length > 1 ? this.stops.findIndex((stop) => stop.place === place) : 0;
    if (index < 0 || index === this.activeIndex()) return;

    this.scrollToStop(index, behavior);
  }

  private scrollToStop(index: number, behavior: ScrollBehavior): void {
    const window = this.document.defaultView;
    const span = this.spans[index];
    if (!window || !span) return;

    const top = index === 0 ? 0 : scrollTargetFor(span, window.innerHeight, HEADER_CLEARANCE);
    window.scrollTo({ top, behavior: this.reducedMotion ? "instant" : behavior });
  }

  private onKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.shiftKey && event.key !== " ") return;
    if ((event.target as Element | null)?.closest?.(INTERACTIVE)) return;
    // A click inside the open lightbox can leave focus on the page body.
    if (this.document.querySelector("dialog[open]")) return;

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      this.goTo(event.key === "Home" ? 0 : this.last, true);
      return;
    }

    const direction = this.direction(event);
    const index = this.activeIndex();
    if (direction === 0 || this.labelRunsOffScreen(index, direction)) return;

    const next = neighbourStop(this.progress, index, direction);
    // Past either end the browser scrolls as usual, which reaches the exit plaque.
    if (next < 0 || next > this.last) return;

    event.preventDefault();
    this.goTo(next, true);
  }

  private direction(event: KeyboardEvent): -1 | 0 | 1 {
    switch (event.key) {
      case "ArrowDown":
      case "PageDown":
        return 1;
      case "ArrowUp":
      case "PageUp":
        return -1;
      case " ":
        return event.shiftKey ? -1 : 1;
      default:
        return 0;
    }
  }

  /** A label taller than the screen is read by ordinary scrolling before the keys move on. */
  private labelRunsOffScreen(index: number, direction: -1 | 1): boolean {
    const window = this.document.defaultView;
    const span = this.spans[index];
    if (!window || !span || index === 0 || Math.abs(this.progress - index) > 0.02) return false;
    if (!this.isTall(span)) return false;

    return direction > 0
      ? span.bottom - window.scrollY > window.innerHeight - 16
      : span.top - window.scrollY < HEADER_CLEARANCE - 1;
  }

  /** Tabbing into another stop's label walks the camera there. */
  private followFocus(event: FocusEvent): void {
    const section = (event.target as Element | null)?.closest<HTMLElement>("[data-stop]");
    const index = Number(section?.dataset["stop"]);
    if (!section || index === this.activeIndex()) return;
    // In a label taller than the screen the browser already scrolled the focused control into view.
    if (!this.isTall(this.spans[index])) this.goTo(index);
  }

  private isTall(span: LabelSpan | undefined): boolean {
    const height = this.document.defaultView?.innerHeight ?? 0;
    return !!span && span.bottom - span.top > height - HEADER_CLEARANCE;
  }

  private focusHeading(index: number): void {
    const heading = this.main()
      .nativeElement.querySelector(`[data-stop="${index}"]`)
      ?.querySelector<HTMLElement>("h1, h2, h3");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  private summarise(): string {
    const names: Record<Work["kind"], [singular: string, plural: string]> = {
      commission: ["commission", "commissions"],
      study: ["study", "studies"],
      "self-portrait": ["self-portrait", "self-portraits"],
    };
    const counted = Object.entries(names).flatMap(([kind, [singular, plural]]) => {
      const total = this.works.filter((work) => work.kind === kind).length;
      return total ? [`${COUNT_WORDS[total] ?? total} ${total === 1 ? singular : plural}`] : [];
    });
    if (!counted.length) return "";
    const last = counted[counted.length - 1];
    const text = counted.length > 1 ? `${counted.slice(0, -1).join(", ")} and ${last}` : last;
    return `${text[0].toUpperCase()}${text.slice(1)} ${this.works.length === 1 ? "hangs" : "hang"} on this wall.`;
  }
}
