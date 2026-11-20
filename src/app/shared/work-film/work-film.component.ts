import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  input,
} from "@angular/core";
import { WorkFilm } from "../../core/content/work.model";

/** What a browser is asked about a film, by the ending of its address. */
const FORMATS: Readonly<Record<string, string | undefined>> = {
  webm: "video/webm",
  mp4: "video/mp4",
};

@Component({
  selector: "app-work-film",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "block", "[class.hidden]": "unplayable()" },
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
  private readonly probe = inject(DOCUMENT).createElement("video");

  readonly film = input.required<WorkFilm>();
  readonly poster = input.required<string>();

  /** Where the browser cannot play the film's format, a player that does nothing is left out. */
  protected readonly unplayable = computed(() => {
    const format = FORMATS[this.film().src.split(/[?#]/)[0].split(".").pop() ?? ""];
    return format !== undefined && this.probe.canPlayType(format) === "";
  });
}
