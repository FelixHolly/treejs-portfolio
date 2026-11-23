import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, effect, inject, DOCUMENT } from "@angular/core";

import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Title } from "@angular/platform-browser";
import { NavigationEnd, Router, Scroll } from "@angular/router";
import { WorksService } from "../../../core/content/works.service";
import { BASE_TITLE, catalogueAnchor, placeFromHash, ROOMS, titleFor } from "../../../core/place/places";
import { PlaceService } from "../../../core/place/place.service";
import { ViewEnvironment } from "../../../core/view-mode/view-environment";
import { ViewModeService } from "../../../core/view-mode/view-mode.service";
import { ScrollGlide } from "../../../shared/scroll/scroll-glide";
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
  // Where Back and Forward put the page, a glide still under way would carry it off again
  host: { "(window:popstate)": "glide.cancel()" },
})
export class CatalogueComponent {
  protected readonly glide = inject(ScrollGlide);

  constructor() {
    const place = inject(PlaceService);
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    const router = inject(Router);
    const title = inject(Title);
    const glide = this.glide;
    const environment = inject(ViewEnvironment);
    const works = inject(WorksService).works();
    const slugs = works.map((work) => work.slug);
    const workTitles = Object.fromEntries(works.map((work) => [work.slug, work.title]));
    inject(ViewModeService).active.set("catalogue");

    effect(() => title.setTitle(titleFor(place.current(), workTitles)));
    // The privacy page sets no title of its own
    destroyRef.onDestroy(() => title.setTitle(BASE_TITLE));

    // A link shared from the gallery (#works/kuechenschelle) is led to the same place on this page.
    const adoptHash = () => {
      const hash = document.location.hash.slice(1);
      const place = placeFromHash(hash, slugs);
      const anchor = place ? catalogueAnchor(place) : null;
      if (anchor && anchor !== hash && !document.getElementById(hash)) {
        void router.navigate([], { fragment: anchor, replaceUrl: true, queryParamsHandling: "preserve" });
      }
    };

    let glidingTo: string | undefined;

    // Each anchor's own CSS scroll margin is what clears the fixed navbar
    const showAnchor = (id: string) => {
      const window = document.defaultView;
      const anchor = document.getElementById(id);
      // A link followed a second time on the way asks for the glide already under way
      if (!window || !anchor || (glide.active && id === glidingTo)) return;

      const margin = parseFloat(window.getComputedStyle(anchor).scrollMarginTop) || 0;
      const top = () => anchor.getBoundingClientRect().top + window.scrollY - margin;
      if (environment.prefersReducedMotion()) {
        window.scrollTo({ top: top(), behavior: "instant" });
        return;
      }
      glidingTo = id;
      void glide.to(top);
    };

    // The router settles a typed-in hash first; adopting it earlier would be cancelled by that navigation.
    router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) adoptHash();
      // Back and Forward carry a position instead, which the browser restores by itself
      if (event instanceof Scroll && event.scrollBehavior !== "manual" && event.anchor && !event.position) showAnchor(event.anchor);
    });
    destroyRef.onDestroy(() => glide.cancel());

    afterNextRender(() => {
      document.getElementById("shell")?.remove();
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
