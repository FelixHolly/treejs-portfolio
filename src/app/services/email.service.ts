import { Injectable } from "@angular/core";
import emailjs from "@emailjs/browser";
import { ContactForm } from "../models/contact.model";
import { environment } from "../../environments/environment";

/**
 * Service for handling contact form email submissions via EmailJS.
 *
 * EmailJS provides a serverless email solution, eliminating the need for
 * a backend API to handle contact form submissions. This reduces infrastructure
 * costs and deployment complexity for static portfolio sites.
 *
 * Security considerations:
 * - Public key is safe to expose in client-side code (rate-limited by EmailJS)
 * - Email template should be configured in EmailJS dashboard to prevent injection
 * - Consider adding reCAPTCHA for production to prevent spam abuse
 */
@Injectable({
  providedIn: "root",
})
export class EmailService {
  private readonly config = environment.emailJs;

  /**
   * Sends contact form data via EmailJS template.
   *
   * Template parameters are mapped to match EmailJS template variable names.
   * The template ID and structure should be configured in the EmailJS dashboard
   * to format these parameters into a properly styled email.
   *
   * @param formData Contact form data from user input
   * @throws Error if email transmission fails (network, rate limit, or API issues)
   */
  async sendContactEmail(formData: ContactForm): Promise<void> {
    // Map form fields to EmailJS template parameters
    // Parameter names must match template variables in EmailJS dashboard
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
