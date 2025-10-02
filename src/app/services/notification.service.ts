import { Injectable, signal } from "@angular/core";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  title: string;
  message: string;
  type: NotificationType;
  timestamp: number;
}

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private notificationSignal = signal<Notification | null>(null);
  public notification = this.notificationSignal.asReadonly();

  showNotification(title: string, message: string, type: NotificationType = "info"): void {
    this.notificationSignal.set({
      title,
      message,
      type,
      timestamp: Date.now(),
    });

    // Auto-dismiss after duration based on type
    const duration = type === "error" ? 7000 : 5000;
    setTimeout(() => {
      this.clearNotification();
    }, duration);
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
    this.notificationSignal.set(null);
  }
}
