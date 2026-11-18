import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, DOCUMENT } from "@angular/core";

import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router } from "@angular/router";
import { WorksService } from "../../../core/content/works.service";
import { catalogueAnchor, placeFromHash, ROOMS } from "../../../core/place/places";
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
    const router = inject(Router);
    const slugs = inject(WorksService)
      .works()
      .map((work) => work.slug);
    inject(ViewModeService).active.set("catalogue");

    // A link shared from the gallery (#works/kuechenschelle) is led to the same place on this page.
    const adoptHash = () => {
      const hash = document.location.hash.slice(1);
      const place = placeFromHash(hash, slugs);
      const anchor = place ? catalogueAnchor(place) : null;
      if (anchor && anchor !== hash && !document.getElementById(hash)) {
        void router.navigate([], { fragment: anchor, replaceUrl: true, queryParamsHandling: "preserve" });
      }
    };

    // The router settles a typed-in hash first; adopting it earlier would be cancelled by that navigation.
    router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) adoptHash();
    });

    afterNextRender(() => {
      adoptHash();

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
