import { Injectable } from "@angular/core";
import emailjs from "@emailjs/browser";
import { ContactForm } from "../models/contact.model";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class EmailService {
  private readonly config = environment.emailJs;

  async sendContactEmail(formData: ContactForm): Promise<void> {
    const templateParams = {
      from_name: formData.name,
      to_name: "Felix Hollndonner",
      from_email: formData.email,
      to_email: "contact@felixhollndonner.com",
      message: formData.message,
    };

    try {
      await emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        templateParams,
        this.config.publicKey
      );
    } catch (error) {
      console.error("Email send failed:", error);
      throw new Error("Failed to send email. Please try again later.");
    }
  }
}
