import { Injectable } from "@angular/core";
import emailjs from "@emailjs/browser";
import { environment } from "../../../environments/environment";
import { ContactForm } from "./contact-form.model";

/** Sends the contact letter through EmailJS, so the static site needs no backend of its own. */
@Injectable({
  providedIn: "root",
})
export class EmailService {
  private readonly config = environment.emailJs;

  /** Rejects with a message fit to show the visitor when the letter could not be sent. */
  async sendContactEmail(formData: ContactForm): Promise<void> {
    // The names are the variables of the template in the EmailJS dashboard
    const templateParams = {
      from_name: formData.name,
      to_name: "Felix Hollndonner",
      from_email: formData.email,
      to_email: "contact@felixhollndonner.com",
      message: formData.message,
    };

    try {
      await emailjs.send(this.config.serviceId, this.config.templateId, templateParams, this.config.publicKey);
    } catch (error) {
      console.error("Email send failed:", error);
      throw new Error("Failed to send email. Please try again later.");
    }
  }
}
