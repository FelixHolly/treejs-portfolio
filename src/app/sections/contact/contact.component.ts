import { Component, signal, ViewChild } from "@angular/core";
import emailjs from "@emailjs/browser";
import { FormsModule, NgForm } from "@angular/forms";
import { NgClass, NgIf } from "@angular/common";

@Component({
  selector: "app-contact",
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.scss"],
  imports: [FormsModule, NgClass, NgIf],
})
export class ContactComponent {
  @ViewChild("contactForm") contactFormRef!: NgForm;

  form = {
    name: "",
    email: "",
    message: "",
  };

  loading = signal(false);
  alert = signal({ show: false, text: "", type: "success" });

  handleSubmit(): void {
    if (!this.contactFormRef.valid) {
      // Mark all controls as touched so error messages show immediately
      Object.values(this.contactFormRef.controls).forEach((control) => {
        control.markAsTouched();
      });

      this.alert.set({
        show: true,
        text: "Please fill out all required fields.",
        type: "danger",
      });
      return;
    }

    this.loading.set(true);

    emailjs
      .send(
        "service_cvyf4pk",
        "template_1cbxfpl",
        {
          from_name: this.form.name,
          to_name: "Your Name",
          from_email: this.form.email,
          to_email: "your@email.com",
          message: this.form.message,
        },
        "uxjMVOPJ12-pBwK7L",
      )
      .then(
        () => {
          this.loading.set(false);
          this.alert.set({
            show: true,
            text: "Thank you for your message 😃",
            type: "success",
          });
          this.contactFormRef.resetForm();

          setTimeout(
            () => this.alert.set({ show: false, text: "", type: "success" }),
            3000,
          );
        },
        (error) => {
          console.error(error);
          this.loading.set(false);
          this.alert.set({
            show: true,
            text: "I didn't receive your message 😢",
            type: "danger",
          });
        },
      );
  }
}
