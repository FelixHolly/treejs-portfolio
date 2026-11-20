import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RevealDirective } from "../../../shared/reveal/reveal.directive";
import { LetterComponent } from "../../../shared/letter/letter.component";

@Component({
  selector: "app-correspondence",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LetterComponent, RevealDirective],
  template: `
    <section class="c-space my-20" id="contact">
      <app-letter class="max-w-[34rem] mx-auto scroll-mt-24" appReveal />
    </section>
  `,
})
export class CorrespondenceComponent {}
