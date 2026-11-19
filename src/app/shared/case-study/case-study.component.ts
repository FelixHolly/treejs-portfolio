import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { CaseStudySection } from "../../core/content/work.model";

@Component({
  selector: "app-case-study",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "grid gap-x-10 gap-y-6" },
  templateUrl: "./case-study.component.html",
})
export class CaseStudyComponent {
  readonly sections = input.required<readonly CaseStudySection[]>();
  /** One below the heading the account sits under, so the page's outline stays whole. */
  readonly headingLevel = input<3 | 4>(3);
}
