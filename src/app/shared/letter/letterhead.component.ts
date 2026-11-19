import { NgOptimizedImage } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** The printed head of the gallery's stationery, with today's date written in beside it. */
@Component({
  selector: "app-letterhead",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  template: `
    <span class="crest">
      <img ngSrc="assets/lion-stamp.webp" width="216" height="280" alt="">
    </span>
    <p class="sender">
      <span class="name">{{ name() }}</span>
      <span class="room">{{ room() }}</span>
    </p>
    <p class="date">{{ date }}</p>
  `,
  styleUrl: "./letterhead.component.scss",
})
export class LetterheadComponent {
  readonly name = input.required<string>();
  readonly room = input.required<string>();

  /** As a letter-writer dates a letter: the day in full, in the visitor's own language. */
  readonly date = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date());
}
