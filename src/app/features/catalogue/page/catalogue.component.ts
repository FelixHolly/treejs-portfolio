import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CorrespondenceComponent } from "../correspondence/correspondence.component";
import { DeveloperComponent } from "../developer/developer.component";
import { EntranceComponent } from "../entrance/entrance.component";
import { FooterComponent } from "../footer/footer.component";
import { NavbarComponent } from "../navbar/navbar.component";
import { VisitorsBookComponent } from "../visitors-book/visitors-book.component";
import { WorksComponent } from "../works/works.component";

@Component({
  selector: "app-catalogue",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NavbarComponent,
    EntranceComponent,
    DeveloperComponent,
    WorksComponent,
    VisitorsBookComponent,
    CorrespondenceComponent,
    FooterComponent,
  ],
  templateUrl: "./catalogue.component.html",
})
export class CatalogueComponent {}
