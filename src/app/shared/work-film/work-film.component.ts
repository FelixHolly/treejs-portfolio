import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { WorkFilm } from "../../core/content/work.model";

@Component({
  selector: "app-work-film",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block" },
  template: `
    <figure>
      <video
        class="block w-full aspect-[16/10] bg-graphite border border-gold/30"
        controls
        muted
        playsinline
        preload="none"
        [muted]="true"
        [src]="film().src"
        [poster]="poster()"
        [attr.aria-label]="film().description"
      ></video>
      <figcaption class="exhibit-caption">Film · Silent screen recording</figcaption>
    </figure>
  `,
})
export class WorkFilmComponent {
  readonly film = input.required<WorkFilm>();
  readonly poster = input.required<string>();
}
