/**
 * Contact form data structure.
 *
 * All fields are required for EmailJS template processing.
 * Validation is handled at the component level via Angular Forms.
 */
export interface ContactForm {
  name: string;
  email: string;
  message: string;
}

/**
 * Legacy alert state interface.
 *
 * @deprecated This interface is no longer used as the application
 * now uses NotificationService with toast notifications instead of inline alerts.
 * Kept for backwards compatibility but should be removed in future refactoring.
 */
export interface AlertState {
  show: boolean;
  text: string;
  type: "success" | "danger";
}

/**
 * EmailJS configuration structure.
 *
 * Configuration values should be stored in environment files:
 * - serviceId: EmailJS service identifier from dashboard
 * - templateId: Email template identifier from dashboard
 * - publicKey: Public API key (safe for client-side exposure, rate-limited by EmailJS)
 */
export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}
