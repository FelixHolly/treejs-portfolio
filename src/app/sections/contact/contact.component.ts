import { Component, inject, signal, ViewChild } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { EmailService } from "../../services/email.service";
import { ContactForm } from "../../models/contact.model";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.scss"],
  imports: [FormsModule],
})
export class ContactComponent {
  private emailService = inject(EmailService);
  private notificationService = inject(NotificationService);

  @ViewChild("contactForm") contactFormRef!: NgForm;

  form: ContactForm = {
    name: "",
    email: "",
    message: "",
  };

  loading = signal(false);

  async handleSubmit(): Promise<void> {
    if (!this.contactFormRef.valid) {
      // Mark all controls as touched so error messages show immediately
      Object.values(this.contactFormRef.controls).forEach((control) => {
        control.markAsTouched();
      });

      this.notificationService.showWarning(
        "Validation Error",
        "Please fill out all required fields."
      );
      return;
    }

    this.loading.set(true);

    try {
      await this.emailService.sendContactEmail(this.form);

      this.loading.set(false);
      this.notificationService.showSuccess(
        "Message Sent",
        "Thank you for your message! I'll get back to you soon."
      );
      this.contactFormRef.resetForm();
    } catch (error) {
      console.error(error);
      this.loading.set(false);
      this.notificationService.showError(
        "Message Failed",
        "Failed to send your message. Please try again or contact me directly."
      );
    }
  }
}
