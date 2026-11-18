import { inject, Injectable, signal } from "@angular/core";
import { Router } from "@angular/router";
import { catalogueAnchor, roomOf } from "../place/places";
import { PlaceService } from "../place/place.service";
import { ViewEnvironment } from "./view-environment";

export type ViewMode = "gallery" | "catalogue";

const MIN_WIDTH = 1024;
const MIN_HEIGHT = 700;

function isViewMode(value: unknown): value is ViewMode {
  return value === "gallery" || value === "catalogue";
}

@Injectable({ providedIn: "root" })
export class ViewModeService {
  private readonly environment = inject(ViewEnvironment);
  private readonly place = inject(PlaceService);
  private readonly router = inject(Router);
  private broken = false;
  private visitChoice: ViewMode | null = null;

  /** The view currently on screen, set by whichever page rendered. */
  readonly active = signal<ViewMode>("catalogue");

  galleryAvailable(): boolean {
    return !this.broken && this.environment.hasWebGL();
  }

  /** A `?view=` request wins, then the visitor's own choice, then what suits the device. */
  resolve(requested: string | null | undefined): ViewMode {
    const stored = this.visitChoice ?? this.environment.storedChoice();
    const wanted = isViewMode(requested) ? requested : isViewMode(stored) ? stored : this.deviceDefault();
    return wanted === "gallery" && !this.galleryAvailable() ? "catalogue" : wanted;
  }

  switchTo(mode: ViewMode): Promise<boolean> {
    this.visitChoice = mode;
    this.environment.storeChoice(mode);
    return this.show(mode);
  }

  /** The gallery failed on this device: fall back for this visit without overwriting the stored choice. */
  reportBroken(): Promise<boolean> {
    this.broken = true;
    return this.show("catalogue");
  }

  private show(mode: ViewMode): Promise<boolean> {
    const place = this.place.current();
    const fragment = mode === "catalogue" ? catalogueAnchor(place) : place;
    const atEntrance = roomOf(place).id === "entrance";
    return this.router.navigate(["/"], {
      fragment: atEntrance ? undefined : fragment,
      onSameUrlNavigation: "reload",
    });
  }

  private deviceDefault(): ViewMode {
    const { width, height } = this.environment.viewport();
    const suited =
      width >= MIN_WIDTH &&
      height >= MIN_HEIGHT &&
      this.environment.hasFinePointer() &&
      !this.environment.prefersReducedMotion() &&
      !this.environment.savesData();
    return suited ? "gallery" : "catalogue";
  }
}
