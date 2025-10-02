import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./pages/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "privacy-policy",
    loadComponent: () =>
      import("./pages/privacy-policy/privacy-policy.component").then(
        (m) => m.PrivacyPolicyComponent
      ),
  },
  {
    path: "terms-conditions",
    loadComponent: () =>
      import("./pages/terms-conditions/terms-conditions.component").then(
        (m) => m.TermsConditionsComponent
      ),
  },
  {
    path: "**",
    redirectTo: "",
  },
];
