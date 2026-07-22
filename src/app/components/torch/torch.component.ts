import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from "@angular/core";

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
  standalone: true,
  template: `<div class="torch" #glow aria-hidden="true"></div>`,
  styleUrls: ["./torch.component.scss"],
})
export class TorchComponent implements AfterViewInit, OnDestroy {
  @ViewChild("glow", { static: true })
  glowRef!: ElementRef<HTMLDivElement>;

  private targetX = 0;
  private targetY = 0;
  private x = 0;
  private y = 0;
  private lit = false;
  private rafId = 0;
  private readonly ease =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 0.1;

  @HostListener("document:mousemove", ["$event"])
  onMouseMove(event: MouseEvent): void {
    this.targetX = event.clientX;
    this.targetY = event.clientY;

    if (!this.lit) {
      this.lit = true;
      this.x = this.targetX;
      this.y = this.targetY;
      this.glowRef.nativeElement.style.opacity = "1";
    }
  }

  ngAfterViewInit(): void {
    const glow = this.glowRef.nativeElement;
    const follow = () => {
      this.rafId = requestAnimationFrame(follow);
      if (!this.lit) return;

      this.x += (this.targetX - this.x) * this.ease;
      this.y += (this.targetY - this.y) * this.ease;
      glow.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) translate(-50%, -50%)`;
    };
    follow();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
