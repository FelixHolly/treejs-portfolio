import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from "@angular/forms";
import { CORRESPONDENCE } from "../../core/content/correspondence.content";
import { EmailService } from "../../services/email.service";
import { composeLetter } from "./compose-letter";
import { EnvelopeComponent } from "./envelope.component";
import { LetterTopicsComponent } from "./letter-topics.component";
import { LetterheadComponent } from "./letterhead.component";
import { PostscriptComponent } from "./postscript.component";
import { SealButtonComponent } from "./seal-button.component";

type Field = "name" | "email" | "message";

const isOpening = (text: string) => CORRESPONDENCE.topics.some((topic) => topic.opening.trim() === text.trim());

/** A letter needs words of the visitor's own: blank space or a topic's opening on its own is not one. */
function written(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() && !isOpening(control.value) ? null : { unwritten: true };
}

@Component({
  selector: "app-letter",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    LetterheadComponent,
    LetterTopicsComponent,
    SealButtonComponent,
    PostscriptComponent,
    EnvelopeComponent,
  ],
  templateUrl: "./letter.component.html",
  styleUrl: "./letter.component.scss",
})
export class LetterComponent {
  private readonly emailService = inject(EmailService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>("letter");
  private readonly messageField = viewChild<ElementRef<HTMLTextAreaElement>>("message");
  private readonly sealed = viewChild<ElementRef<HTMLElement>>("sealed");

  readonly posted = output<void>();

  readonly content = CORRESPONDENCE;
  readonly loading = signal(false);
  readonly submitted = signal(false);
  /** True after a send that the mail service refused, until the next attempt. */
  readonly failed = signal(false);
  /** The address a sent letter will be answered at; while set, the envelope stands in for the sheet. */
  readonly repliesTo = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    topic: [""],
    message: ["", written],
    name: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
  });

  showError(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  /** Writes the letter's first words, unless the visitor has already written their own. */
  startWith(opening: string): void {
    const control = this.form.controls.message;
    if (control.invalid) control.setValue(opening);
  }

  async send(): Promise<void> {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Focus after the error text exists, so it is read out with the field
      this.focusNext(() => this.formElement()?.nativeElement.querySelector<HTMLElement>(".ng-invalid[formControlName]"));
      return;
    }

    this.loading.set(true);
    this.failed.set(false);
    try {
      const letter = this.form.getRawValue();
      await this.emailService.sendContactEmail(composeLetter(letter));
      this.form.reset();
      this.submitted.set(false);
      this.repliesTo.set(letter.email);
      this.posted.emit();
      // The sheet is gone, so focus moves to what replaced it
      this.focusNext(() => this.sealed()?.nativeElement);
      // The envelope is shorter than the sheet was, which can leave it half under the page header
      afterNextRender(() => this.host.nativeElement.scrollIntoView({ block: "nearest" }), { injector: this.injector });
    } catch {
      this.failed.set(true);
      // The seal was disabled under the visitor's focus while sending
      this.focusNext(() => this.formElement()?.nativeElement.querySelector<HTMLElement>("button[type=submit]"));
    } finally {
      this.loading.set(false);
    }
  }

  writeAnother(): void {
    this.repliesTo.set(null);
    this.focusNext(() => this.messageField()?.nativeElement);
  }

  private focusNext(find: () => HTMLElement | null | undefined): void {
    afterNextRender(() => find()?.focus(), { injector: this.injector });
  }
}
