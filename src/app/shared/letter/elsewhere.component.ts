import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { CorrespondenceLink } from "../../core/content/correspondence.content";

/** The other ways to reach the owner, as one plain sentence beside the letter. */
@Component({
  selector: "app-letter-elsewhere",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>
      Or
      @if (cvHref(); as cv) {
        <a [href]="cv" download>download my CV</a><span>, or </span>
      }
      find me on
      @for (link of links(); track link.href) {
        @if (!$first) {
          <span>{{ $last ? " or " : ", " }}</span>
        }
        <a [href]="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }}<span class="sr-only"> (opens in a new tab)</span></a>
      }.
    </p>
  `,
  styleUrl: "./elsewhere.component.scss",
})
export class ElsewhereComponent {
  readonly links = input.required<readonly CorrespondenceLink[]>();
  readonly cvHref = input<string | null>(null);
}
