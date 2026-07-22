import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  inject,
} from "@angular/core";

/**
 * Spotlight reveal: the element rests in shadow (faded, slightly lowered)
 * until it scrolls into view, then settles into place, like a piece
 * emerging as the visitor's light reaches it.
 *
 * Usage: <div appReveal [revealDelay]="120">…</div>
 * The transition lives in styles.scss (.reveal-init / .reveal-in), where
 * prefers-reduced-motion disables it globally.
 */
@Directive({
  selector: "[appReveal]",
  standalone: true,
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  /** Transition delay in ms, for staggering pieces within one wall. */
  @Input() revealDelay = 0;

  private el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const node = this.el.nativeElement;
    node.classList.add("reveal-init");
    if (this.revealDelay) {
      node.style.transitionDelay = `${this.revealDelay}ms`;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            node.classList.add("reveal-in");
            this.observer?.disconnect();
          }
        });
      },
      // Fire once ~12% of the piece has cleared the bottom edge
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
