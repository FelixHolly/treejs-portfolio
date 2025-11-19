import { Injectable, signal } from "@angular/core";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  title: string;
  message: string;
  type: NotificationType;
  timestamp: number;
}

/**
 * Service for managing application-wide toast notifications.
 *
 * Uses Angular signals for reactive state management, allowing components
 * to automatically react to notification changes without manual subscriptions.
 *
 * Design decisions:
 * - Single notification at a time (simpler UX, prevents notification spam)
 * - Auto-dismiss with type-based timing (errors shown longer)
 * - Timestamp included for potential animation/transition logic
 */
@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private notificationSignal = signal<Notification | null>(null);
  public notification = this.notificationSignal.asReadonly();

  /**
   * Displays a notification toast with automatic dismissal.
   *
   * Timing rationale:
   * - Errors: 7000ms (7s) - Users need more time to read error details
   * - Success/Info/Warning: 5000ms (5s) - Standard toast duration
   *
   * Based on UX research showing optimal reading time for toast messages
   * (approximately 150-200 words per minute for skimming).
   *
   * @param title Notification heading
   * @param message Detailed notification content
   * @param type Notification severity level
   */
  showNotification(title: string, message: string, type: NotificationType = "info"): void {
    this.notificationSignal.set({
      title,
      message,
      type,
      timestamp: Date.now(),
    });

    // Auto-dismiss with longer duration for errors (more critical information)
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
