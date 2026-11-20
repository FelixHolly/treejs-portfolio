import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ArrowDownIconComponent } from "../../../shared/icons/arrow-down.icon";
import { GalleryDoorComponent } from "../navbar/gallery-door.component";
import { SectionLinkDirective } from "../navbar/section-link.directive";
import { StatueComponent } from "./statue/statue.component";

@Component({
  selector: "app-entrance",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ArrowDownIconComponent, GalleryDoorComponent, SectionLinkDirective, StatueComponent],
  templateUrl: "./entrance.component.html",
  styleUrl: "./entrance.component.scss",
})
export class EntranceComponent {}
