import { Injectable, signal } from "@angular/core";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  title: string;
  message: string;
  type: NotificationType;
}

/** Errors stay up longer: they carry something the visitor has to act on. */
const DISMISS_AFTER_MS = { error: 7000, other: 5000 } as const;

/** One toast at a time for the whole application; a newer notice replaces the one on show. */
@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private readonly current = signal<Notification | null>(null);
  private dismissTimer?: ReturnType<typeof setTimeout>;

  readonly notification = this.current.asReadonly();

  showNotification(title: string, message: string, type: NotificationType = "info"): void {
    // Without this the timer of the notice being replaced would take the new one down early
    clearTimeout(this.dismissTimer);
    this.current.set({ title, message, type });
    const duration = type === "error" ? DISMISS_AFTER_MS.error : DISMISS_AFTER_MS.other;
    this.dismissTimer = setTimeout(() => this.clearNotification(), duration);
  }

  showError(title: string, message: string): void {
    this.showNotification(title, message, "error");
  }

  showSuccess(title: string, message: string): void {
    this.showNotification(title, message, "success");
  }

  showInfo(title: string, message: string): void {
    this.showNotification(title, message, "info");
  }

  showWarning(title: string, message: string): void {
    this.showNotification(title, message, "warning");
  }

  clearNotification(): void {
    clearTimeout(this.dismissTimer);
    this.current.set(null);
  }
}
