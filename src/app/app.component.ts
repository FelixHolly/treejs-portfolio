import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NotificationToastComponent } from "./core/notification/notification-toast.component";
import { TorchComponent } from "./shared/torch/torch.component";
import { ViewModeService } from "./core/view-mode/view-mode.service";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NotificationToastComponent, TorchComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly viewMode = inject(ViewModeService);
}
