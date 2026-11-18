import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { RouterLink } from "@angular/router";
import { environment } from "../../../environments/environment";
import { DEVELOPER } from "../../core/content/developer.content";
import { VISITOR_ENTRIES } from "../../core/content/visitors-book.content";
import { Work } from "../../core/content/work.model";
import { WorksService } from "../../core/content/works.service";
import { placeFromHash } from "../../core/place/places";
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
import { GalleryView } from "./scene/gallery-view";
import { LabelSpan, progressFromScroll, scrollTargetFor } from "./scroll-progress";
import { buildStops } from "./stops";

/** Room the fixed header needs above a label that is taller than the screen. */
const HEADER_CLEARANCE = 96;
const CROSS_FADE_MS = 260;
/** Breathing room kept between a piece and the label beside it, in pixels. */
const SIDE_GUTTER = 24;
/** Keys must not step the walk while the visitor is typing or operating a control. */
const INTERACTIVE = "input, textarea, select, button, a, dialog, [contenteditable]";
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six"];

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
  private readonly reducedMotion = inject(ViewEnvironment).prefersReducedMotion();
  private readonly works = inject(WorksService).works();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  private readonly main = viewChild.required<ElementRef<HTMLElement>>("main");
  private readonly lightbox = viewChild.required(LightboxComponent);

  readonly stops = buildStops(this.works);
  readonly developer = DEVELOPER;
  readonly entries = VISITOR_ENTRIES;
  readonly year = new Date().getFullYear();
  readonly worksSummary = this.summarise();

  readonly activeIndex = signal(0);
  /** True while the scene cuts between stops for visitors who asked for reduced motion. */
  readonly fading = signal(false);
  readonly slow = signal(false);
  readonly currentRoom = computed(() => this.stops[this.activeIndex()].room);
  readonly announcement = computed(() => {
    const room = this.currentRoom();
    return room.numeral ? `Room ${room.numeral}, ${room.name}` : room.name;
  });

  private spans: LabelSpan[] = [];
  private progress = 0;
  private scene?: GalleryView;
  private fadeTarget = 0;
  private fadeTimer = 0;
  /** Share of the screen width that a label beside the scene covers; 0 when labels sit over it. */
  private labelShare = 0;

  constructor() {
    this.viewMode.active.set("gallery");
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => this.start(destroyRef));
  }

  /** Walks to a stop; with `focus` the stop's heading takes keyboard focus on arrival. */
  goTo(index: number, focus = false): void {
    const window = this.document.defaultView;
    const span = this.spans[index];
    if (!window || !span) return;

    const top = index === 0 ? 0 : scrollTargetFor(span, window.innerHeight, HEADER_CLEARANCE);
    window.scrollTo({ top, behavior: this.reducedMotion ? "instant" : "smooth" });
    if (focus) this.focusHeading(index);
  }

  visit(place: string): void {
    const index = this.stops.findIndex((stop) => stop.place === place);
    if (index >= 0) this.goTo(index, true);
  }

  closerLook(work: Work): void {
    this.lightbox().open(work);
  }

  private start(destroyRef: DestroyRef): void {
    const window = this.document.defaultView;
    if (!window) return;
    const root = this.document.documentElement;
    const main = this.main().nativeElement;
    let destroyed = false;

    root.classList.add("gallery-active");
    this.measure();
    this.restoreFromHash("instant");
    this.syncFromScroll();
    this.fadeTarget = this.activeIndex();

    const onScroll = () => this.syncFromScroll();
    const onResize = () => {
      this.measure();
      this.scene?.resize(this.labelShare);
      this.syncFromScroll();
    };
    const onKey = (event: KeyboardEvent) => this.onKey(event);
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      this.scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };
    const onHash = () => this.restoreFromHash("smooth");
    const onVisibility = () => this.scene?.setPaused(this.document.hidden);
    const onFocus = (event: FocusEvent) => this.followFocus(event);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("hashchange", onHash);
    this.document.addEventListener("visibilitychange", onVisibility);
    main.addEventListener("focusin", onFocus);

    // Labels change height when fonts arrive or the letter shows its errors.
    const resizeObserver = new ResizeObserver(() => {
      this.measure();
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
            scene.resize(this.labelShare);
            scene.jumpTo(this.reducedMotion ? this.activeIndex() : this.progress);
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
      })),
      frieze: this.developer.frieze,
      reducedMotion: this.reducedMotion,
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
      label.style.scrollMarginTop = index === 0 ? "0px" : `${Math.max(spare, HEADER_CLEARANCE)}px`;
    });

    const side = boxes[1];
    const beside = side && side.left > width * 0.3;
    this.labelShare = beside ? (width - side.left + SIDE_GUTTER) / width : 0;
  }

  private syncFromScroll(): void {
    const window = this.document.defaultView;
    if (!window) return;

    this.progress = progressFromScroll(window.scrollY, this.spans, window.innerHeight);
    const index = Math.round(this.progress);
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
    // replaceState keeps every stop linkable without filling the history with one entry per stop
    window?.history.replaceState(
      window.history.state,
      "",
      index === 0 ? window.location.pathname + window.location.search : `#${stop.place}`,
    );
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
    const index = this.stops.findIndex((stop) => stop.place === place);
    if (index < 0 || index === this.activeIndex()) return;

    const span = this.spans[index];
    const top = index === 0 ? 0 : scrollTargetFor(span, window.innerHeight, HEADER_CLEARANCE);
    window.scrollTo({ top, behavior: this.reducedMotion ? "instant" : behavior });
  }

  private onKey(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as Element | null)?.closest?.(INTERACTIVE)) return;

    const last = this.stops.length - 1;
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      this.goTo(event.key === "Home" ? 0 : last, true);
      return;
    }

    const direction = this.direction(event);
    const index = this.activeIndex();
    if (direction === 0 || this.labelRunsOffScreen(index, direction)) return;

    const settled = Math.abs(this.progress - index) < 0.02;
    const next =
      direction > 0
        ? settled
          ? index + 1
          : Math.ceil(this.progress)
        : settled
          ? index - 1
          : Math.floor(this.progress);
    // Past either end the browser scrolls as usual, which reaches the exit plaque.
    if (next < 0 || next > last) return;

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
    if (!window || !span || index === 0) return false;
    if (span.bottom - span.top <= window.innerHeight - HEADER_CLEARANCE) return false;

    return direction > 0
      ? span.bottom - window.scrollY > window.innerHeight - 16
      : span.top - window.scrollY < HEADER_CLEARANCE - 1;
  }

  /** Tabbing into another stop's label walks the camera there. */
  private followFocus(event: FocusEvent): void {
    const section = (event.target as Element | null)?.closest<HTMLElement>("[data-stop]");
    const index = Number(section?.dataset["stop"]);
    if (section && index !== this.activeIndex()) this.goTo(index);
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
    const phrase = (kind: Work["kind"], singular: string, plural: string) => {
      const total = this.works.filter((work) => work.kind === kind).length;
      return total ? `${COUNT_WORDS[total] ?? total} ${total === 1 ? singular : plural}` : "";
    };
    const text = [phrase("commission", "commission", "commissions"), phrase("study", "study", "studies")]
      .filter(Boolean)
      .join(" and ");
    if (!text) return "";
    return `${text[0].toUpperCase()}${text.slice(1)} ${this.works.length === 1 ? "hangs" : "hang"} on this wall.`;
  }
}
