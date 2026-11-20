import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input } from "@angular/core";

/**
 * The element rests faded and slightly lowered until it scrolls into view, then settles into place.
 * The transition lives in styles.scss (.reveal-init / .reveal-in), which also honours reduced motion.
 */
@Directive({
  selector: "[appReveal]",
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  /** Transition delay in ms, for staggering pieces within one wall. */
  readonly revealDelay = input(0);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const node = this.el.nativeElement;
    node.classList.add("reveal-init");
    if (this.revealDelay()) {
      node.style.transitionDelay = `${this.revealDelay()}ms`;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          node.classList.add("reveal-in");
          this.observer?.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
