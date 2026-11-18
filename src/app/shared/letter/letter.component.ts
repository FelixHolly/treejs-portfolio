import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector, signal, viewChild } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { CORRESPONDENCE } from "../../core/content/correspondence.content";
import { EmailService } from "../../services/email.service";
import { NotificationService } from "../../services/notification.service";
import { ArrowOutIconComponent } from "../icons/arrow-out.icon";

type Field = "name" | "email" | "message";

@Component({
  selector: "app-letter",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ArrowOutIconComponent],
  host: { class: "block" },
  templateUrl: "./letter.component.html",
  styleUrl: "./letter.component.scss",
})
export class LetterComponent {
  private readonly emailService = inject(EmailService);
  private readonly notificationService = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly formElement = viewChild.required<ElementRef<HTMLFormElement>>("letter");

  readonly content = CORRESPONDENCE;
  readonly loading = signal(false);
  readonly submitted = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    message: ["", Validators.required],
  });

  showError(field: Field): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  async send(): Promise<void> {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Focus after the error text exists, so it is read out with the field
      afterNextRender(
        () => this.formElement().nativeElement.querySelector<HTMLElement>(".ng-invalid[formControlName]")?.focus(),
        { injector: this.injector },
      );
      return;
    }

    this.loading.set(true);
    try {
      await this.emailService.sendContactEmail(this.form.getRawValue());
      this.notificationService.showSuccess("Message Sent", "Thank you for your message! I'll get back to you soon.");
      this.form.reset();
      this.submitted.set(false);
    } catch {
      this.notificationService.showError("Message Failed", "Your message could not be sent. Please try again, or reach me on LinkedIn.");
    } finally {
      this.loading.set(false);
    }
  }
}
