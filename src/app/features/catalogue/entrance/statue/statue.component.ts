import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { NgOptimizedImage } from "@angular/common";
import { environment } from "../../../../../environments/environment";
import { ViewEnvironment } from "../../../../core/view-mode/view-environment";
import { HERO_SCENE_FACTORY } from "./hero-scene.factory";
import { HeroView, scrollShare } from "./scene/hero-view";

type StillState = "loading" | "ready" | "failed";

/** The longest the scene waits for the browser to fall idle before it loads anyway, in milliseconds. */
const IDLE_TIMEOUT = 2500;
/** Where the browser cannot say when it is idle, the scene loads this long after the page has, in milliseconds. */
const IDLE_FALLBACK = 600;

// A still picture first, and for good where motion, data or the device say so; otherwise the gallery's own
// statue takes its place, once the page has loaded and come to rest.
@Component({
  selector: "app-entrance-statue",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  templateUrl: "./statue.component.html",
  styleUrl: "./statue.component.scss",
})
export class StatueComponent {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly view = inject(ViewEnvironment);
  private readonly createScene = inject(HERO_SCENE_FACTORY);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>("canvas");

  readonly still = signal<StillState>("loading");
  /** Turns false for good when a scene that was tried gives up. A phone keeps the picture: iOS never says it is saving data. */
  readonly animated = signal(
    this.view.hasWebGL() && this.view.hasFinePointer() && !this.view.prefersReducedMotion() && !this.view.savesData(),
  );
  /** True from the scene's first frame with the statue in it, when it takes the picture's place. */
  readonly live = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => this.start(destroyRef));
  }

  private start(destroyRef: DestroyRef): void {
    const window = this.document.defaultView;
    const canvas = this.canvas()?.nativeElement;
    if (!window || !canvas) return;

    const band = this.host.nativeElement;
    const listening = new AbortController();
    const ended = listening.signal;
    let scene: HeroView | undefined;
    /** How far the page must scroll for the band to have left the window. */
    let reach = 0;
    let visible = false;
    let settled = false;
    let requested = false;

    const pause = () => scene?.setPaused(!visible || this.document.hidden);
    const onScroll = () => scene?.setScroll(scrollShare(window.scrollY, reach));
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      scene?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };

    const close = () => {
      listening.abort();
      scene?.dispose();
      scene = undefined;
    };
    const giveUp = () => {
      close();
      this.live.set(false);
      this.animated.set(false);
    };

    const open = () => {
      if (requested || !visible || !settled) return;
      requested = true;
      this.createScene(canvas, {
        assets: { dracoPath: environment.assets.dracoPath, lionModel: environment.assets.models.heroModel },
        onReady: () => this.live.set(true),
        onLost: giveUp,
      })
        .then((made) => {
          if (ended.aborted) {
            made.dispose();
            return;
          }
          scene = made;
          window.addEventListener("scroll", onScroll, { passive: true, signal: ended });
          window.addEventListener("pointermove", onPointer, { passive: true, signal: ended });
          this.document.addEventListener("visibilitychange", pause, { signal: ended });
          fit();
          onScroll();
          pause();
        })
        .catch(giveUp);
    };

    // Off screen the scene is neither loaded nor drawn
    const sight = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      open();
      pause();
    });
    sight.observe(band);

    // Dust keeps to the band the statue stands in: above it lies the name, which a bright speck would cross
    const fit = () => {
      const picture = canvas.getBoundingClientRect();
      const stands = band.getBoundingClientRect();
      reach = stands.bottom + window.scrollY;
      scene?.resize(picture.height > 0 ? (stands.top - picture.top) / picture.height : 0);
    };
    const sizes = new ResizeObserver(() => {
      fit();
      onScroll();
    });
    sizes.observe(canvas);
    sizes.observe(band);

    // The page comes first: nothing of the scene is fetched before it has loaded and the browser has a moment to spare
    const settle = () => {
      settled = true;
      open();
    };
    const whenIdle = () => {
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(settle, { timeout: IDLE_TIMEOUT });
        ended.addEventListener("abort", () => window.cancelIdleCallback(id));
      } else {
        const id = window.setTimeout(settle, IDLE_FALLBACK);
        ended.addEventListener("abort", () => window.clearTimeout(id));
      }
    };
    if (this.document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true, signal: ended });

    ended.addEventListener("abort", () => {
      sight.disconnect();
      sizes.disconnect();
    });
    destroyRef.onDestroy(close);
  }
}
