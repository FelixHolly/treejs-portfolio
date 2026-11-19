import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  viewChild,
} from "@angular/core";
import { drawHouse, HOUSE_VIEW, NOTE_LEADERS, PLATE_TITLE, Storey } from "./draw-section-plate";

@Component({
  selector: "app-section-plate",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./section-plate.component.html",
  styleUrl: "./section-plate.component.scss",
})
export class SectionPlateComponent {
  /** The layers of an application from the roof down; the house has four storeys, so any further ones are left out. */
  readonly storeys = input.required<readonly Storey[]>();

  readonly title = PLATE_TITLE;
  readonly viewBox = `${HOUSE_VIEW.x} ${HOUSE_VIEW.y} ${HOUSE_VIEW.width} ${HOUSE_VIEW.height}`;
  readonly proportions = `${HOUSE_VIEW.width} / ${HOUSE_VIEW.height}`;
  readonly rise = HOUSE_VIEW.height / HOUSE_VIEW.width;

  readonly notes = computed(() =>
    this.storeys()
      .slice(0, NOTE_LEADERS.length)
      .map((storey, index) => {
        const { line, row } = NOTE_LEADERS[index];
        const drop = row - (NOTE_LEADERS[index - 1]?.row ?? 0);
        return { storey, dot: line[0], points: line.map((point) => point.join(",")).join(" "), drop };
      }),
  );

  private readonly house = viewChild.required<ElementRef<HTMLCanvasElement>>("house");

  constructor() {
    const { fonts, defaultView } = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const canvas = this.house().nativeElement;
      // A canvas scaled by CSS blurs its thin lines, so the house is redrawn at whatever size it is given.
      const observer = new ResizeObserver(([entry]) =>
        drawHouse(canvas, entry.contentRect.width * (defaultView?.devicePixelRatio ?? 1)),
      );
      destroyRef.onDestroy(() => observer.disconnect());

      void fonts.ready.then(() => {
        if (!destroyRef.destroyed) observer.observe(canvas);
      });
    });
  }
}
