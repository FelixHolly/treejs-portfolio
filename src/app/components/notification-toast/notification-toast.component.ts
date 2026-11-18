import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-notification-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./notification-toast.component.html",
  styleUrl: "./notification-toast.component.scss",
})
export class NotificationToastComponent {
  private notificationService = inject(NotificationService);
  notification = this.notificationService.notification;

  dismiss(): void {
    this.notificationService.clearNotification();
  }
}
