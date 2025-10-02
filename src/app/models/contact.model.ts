export interface ContactForm {
  name: string;
  email: string;
  message: string;
}

export interface AlertState {
  show: boolean;
  text: string;
  type: "success" | "danger";
}

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}
