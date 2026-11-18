import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { ROOMS } from "../../../core/place/places";
import { PlaceService } from "../../../core/place/place.service";
import { ViewModeService } from "../../../core/view-mode/view-mode.service";
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
export class CatalogueComponent {
  constructor() {
    const place = inject(PlaceService);
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    inject(ViewModeService).active.set("catalogue");

    afterNextRender(() => {
      // A room is current while it crosses a band around the upper third of the viewport.
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const room = ROOMS.find((candidate) => candidate.catalogueId === entry.target.id);
            if (entry.isIntersecting && room) place.current.set(room.id);
          }
        },
        { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
      );

      for (const room of ROOMS) {
        const section = document.getElementById(room.catalogueId);
        if (section) observer.observe(section);
      }
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
