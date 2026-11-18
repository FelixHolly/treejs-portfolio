import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ViewportScroller } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import { NotificationToastComponent } from "./components/notification-toast/notification-toast.component";
import { TorchComponent } from "./components/torch/torch.component";
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

  constructor() {
    // Router anchor scrolling ignores CSS scroll-margin; clear the 5.5rem fixed navbar.
    inject(ViewportScroller).setOffset([0, 88]);
  }
}
