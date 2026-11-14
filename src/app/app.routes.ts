import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadChildren: () => import("./features/catalogue/catalogue.routes").then((m) => m.CATALOGUE_ROUTES),
  },
  {
    path: "privacy-policy",
    loadComponent: () =>
      import("./pages/privacy-policy/privacy-policy.component").then((m) => m.PrivacyPolicyComponent),
  },
  { path: "**", redirectTo: "" },
];
