/**
 * Application routing configuration using lazy-loaded standalone components.
 *
 * Performance strategy:
 * - All routes use loadComponent for code splitting and lazy loading
 * - Each page is bundled separately, loaded only when navigated to
 * - Reduces initial bundle size and improves First Contentful Paint
 *
 * Route structure:
 * - Root (""): Main portfolio page with all sections
 * - privacy-policy: Legal requirement for contact form/data collection
 * - terms-conditions: Usage terms and conditions
 * - Wildcard (**): Redirects invalid routes to home (prevents 404s)
 *
 * Note: Privacy and terms pages are rarely visited but legally required.
 * Lazy loading keeps them out of the critical path.
 */
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
    // Catch-all route for invalid URLs
    path: "**",
    redirectTo: "",
  },
];
