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
    loadComponent: () =>
      import("./pages/privacy-policy/privacy-policy.component").then((m) => m.PrivacyPolicyComponent),
  },
  { path: "**", redirectTo: "" },
];
