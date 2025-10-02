import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NotificationToastComponent } from "./components/notification-toast/notification-toast.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, NotificationToastComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {}
