import { Routes } from "@angular/router";
import { galleryMatch } from "./core/view-mode/gallery-match.guard";

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    canMatch: [galleryMatch],
    loadChildren: () => import("./features/gallery/gallery.routes").then((m) => m.GALLERY_ROUTES),
  },
  {
    path: "",
    pathMatch: "full",
    loadChildren: () => import("./features/catalogue/catalogue.routes").then((m) => m.CATALOGUE_ROUTES),
  },
  {
    path: "privacy-policy",
    loadChildren: () =>
      import("./features/privacy-policy/privacy-policy.routes").then((m) => m.PRIVACY_POLICY_ROUTES),
  },
  { path: "**", redirectTo: "" },
];
