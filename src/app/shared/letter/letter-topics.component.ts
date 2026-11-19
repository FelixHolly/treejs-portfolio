import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { LetterTopic } from "../../core/content/correspondence.content";

/** Three passes of a pen around a word. No two are alike, so the circle never looks stamped on. */
const CIRCLES = [
  "M22 7C46 1 91 2 96 17c4 15-32 22-61 20C13 36 1 29 4 18 7 7 33 2 59 5",
  "M31 5c29-5 66 0 65 15-1 14-37 19-66 17C8 35 0 26 5 15 10 5 40 1 67 7",
  "M17 10C39 2 90 0 97 15c5 15-27 23-57 23C14 38 2 30 3 19 4 8 28 3 53 3",
];

/** The "Re:" line: an optional choice of what the letter is about, made by circling a printed word. */
@Component({
  selector: "app-letter-topics",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  host: { role: "radiogroup", "aria-labelledby": "letter-re" },
  templateUrl: "./letter-topics.component.html",
  styleUrl: "./letter-topics.component.scss",
})
export class LetterTopicsComponent {
  readonly control = input.required<FormControl<string>>();
  readonly topics = input.required<readonly LetterTopic[]>();
  readonly chose = output<LetterTopic>();

  readonly circles = CIRCLES;
}
