import { Component, inject } from "@angular/core";
import { NgClass } from "@angular/common";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-notification-toast",
  standalone: true,
  imports: [NgClass],
  templateUrl: "./notification-toast.component.html",
  styleUrls: ["./notification-toast.component.scss"],
})
export class NotificationToastComponent {
  private notificationService = inject(NotificationService);
  notification = this.notificationService.notification;

  dismiss(): void {
    this.notificationService.clearNotification();
  }
}
