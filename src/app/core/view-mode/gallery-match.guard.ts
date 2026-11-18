import { inject } from "@angular/core";
import { CanMatchFn, Router } from "@angular/router";
import { ViewModeService } from "./view-mode.service";

export const galleryMatch: CanMatchFn = () => {
  const requested = inject(Router).currentNavigation()?.extractedUrl.queryParamMap.get("view");
  return inject(ViewModeService).resolve(requested) === "gallery";
};
