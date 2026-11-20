import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, viewChild } from "@angular/core";

/**
 * The visitor's torch: a faint warm glow that follows the cursor across
 * the gallery walls, like carrying a light through a dark museum.
 *
 * Desktop only (hidden for coarse pointers in CSS). The glow trails the
 * cursor with a slight lag; under prefers-reduced-motion it follows
 * immediately. Invisible until the first mouse movement.
 */
@Component({
  selector: "app-torch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="torch" #glow aria-hidden="true"></div>`,
  styleUrl: "./torch.component.scss",
  host: { "(document:mousemove)": "onMouseMove($event)" },
})
export class TorchComponent implements OnDestroy {
  private readonly glow = viewChild.required<ElementRef<HTMLDivElement>>("glow");

  private targetX = 0;
  private targetY = 0;
  private x = 0;
  private y = 0;
  private lit = false;
  private rafId = 0;
  private readonly ease =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0.1;

  onMouseMove(event: MouseEvent): void {
    this.targetX = event.clientX;
    this.targetY = event.clientY;

    if (!this.lit) {
      this.lit = true;
      this.x = this.targetX;
      this.y = this.targetY;
      this.glow().nativeElement.style.opacity = "1";
    }
    if (!this.rafId) this.rafId = requestAnimationFrame(this.follow);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  /** Runs only while the glow still trails the cursor, so a resting mouse costs no frames. */
  private readonly follow = (): void => {
    this.x += (this.targetX - this.x) * this.ease;
    this.y += (this.targetY - this.y) * this.ease;
    this.glow().nativeElement.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) translate(-50%, -50%)`;

    const settled = Math.abs(this.targetX - this.x) < 0.5 && Math.abs(this.targetY - this.y) < 0.5;
    this.rafId = settled ? 0 : requestAnimationFrame(this.follow);
  };
}
