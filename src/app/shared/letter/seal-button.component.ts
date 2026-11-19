import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { WaxSealComponent } from "./wax-seal.component";

/** Sending a letter means sealing it: the wax seal and the words beside it are one submit button. */
@Component({
  selector: "app-seal-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WaxSealComponent],
  host: { class: "flex" },
  template: `
    <button type="submit" class="seal-button" [disabled]="sending()">
      <span>{{ sending() ? "Sending" : "Seal and send" }}</span>
      <app-wax-seal class="seal" />
    </button>
  `,
  styleUrl: "./seal-button.component.scss",
})
export class SealButtonComponent {
  readonly sending = input(false);
}
