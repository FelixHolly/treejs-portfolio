import { NgOptimizedImage } from "@angular/common";
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
import { ArrowOutIconComponent } from "../icons/arrow-out.icon";

type Field = "name" | "email" | "message";

const isStarter = (text: string) => CORRESPONDENCE.starters.some((starter) => starter.opening.trim() === text.trim());

/** A letter needs words of the visitor's own: blank space or a starter on its own is not one. */
function written(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() && !isStarter(control.value) ? null : { unwritten: true };
}

@Component({
  selector: "app-letter",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgOptimizedImage, ArrowOutIconComponent],
  host: { class: "block" },
  templateUrl: "./letter.component.html",
  styleUrl: "./letter.component.scss",
})
export class LetterComponent {
  private readonly emailService = inject(EmailService);
  private readonly injector = inject(Injector);
  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>("letter");
  private readonly messageField = viewChild<ElementRef<HTMLTextAreaElement>>("message");
  private readonly sealed = viewChild<ElementRef<HTMLElement>>("sealed");

  readonly posted = output<void>();

  readonly content = CORRESPONDENCE;
  readonly loading = signal(false);
  readonly submitted = signal(false);
  /** True after a send that the mail service refused, until the next attempt. */
  readonly failed = signal(false);
  /** The address a sent letter will be answered at; while set, the confirmation stands in for the form. */
  readonly repliesTo = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    message: ["", written],
  });

  showError(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  /** Writes the letter's first words, unless the visitor has already written their own. */
  startWith(opening: string): void {
    const control = this.form.controls.message;
    if (control.invalid) control.setValue(opening);

    const field = this.messageField()?.nativeElement;
    field?.focus();
    field?.setSelectionRange(field.value.length, field.value.length);
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
      await this.emailService.sendContactEmail(letter);
      this.form.reset();
      this.submitted.set(false);
      this.repliesTo.set(letter.email);
      this.posted.emit();
      // The form is gone, so focus moves to what replaced it
      this.focusNext(() => this.sealed()?.nativeElement);
    } catch {
      this.failed.set(true);
      // The button was disabled under the visitor's focus while sending
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
