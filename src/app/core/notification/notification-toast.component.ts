import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { NotificationService } from "./notification.service";

@Component({
  selector: "app-notification-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./notification-toast.component.html",
  styleUrl: "./notification-toast.component.scss",
})
export class NotificationToastComponent {
  private readonly notificationService = inject(NotificationService);
  protected readonly notification = this.notificationService.notification;

  protected dismiss(): void {
    this.notificationService.clearNotification();
  }
}
