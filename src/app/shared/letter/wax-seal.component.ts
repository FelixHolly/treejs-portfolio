import { ChangeDetectionStrategy, Component } from "@angular/core";

let seals = 0;

/** The gallery's seal in gold-brown wax. Decorative: whatever carries it gives it its meaning and its size. */
@Component({
  selector: "app-wax-seal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block" },
  templateUrl: "./wax-seal.component.html",
})
export class WaxSealComponent {
  /** A gradient is found by its id, and an id must stay unique on a page that can hold more than one seal. */
  readonly wax = `wax-${seals++}`;
}
