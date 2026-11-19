import { NgOptimizedImage } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** The front of a letter that has gone: stamped, postmarked and addressed to the room it was written in. */
@Component({
  selector: "app-letter-envelope",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  templateUrl: "./envelope.component.html",
  styleUrl: "./envelope.component.scss",
})
export class EnvelopeComponent {
  readonly name = input.required<string>();
  readonly room = input.required<string>();
}
