import { ApplicationConfig, ErrorHandler, isDevMode, provideZonelessChangeDetection } from "@angular/core";
import { provideRouter, withInMemoryScrolling, withRouterConfig } from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";

import { routes } from "./app.routes";
import { GlobalErrorHandler } from "./core/error-handler/global-error-handler.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Kept for its Scroll event, which names the anchor a link or an old deep link (/#projects) leads to:
      // the catalogue glides there itself, because Mobile Safari rushes a scroll left to the browser
      withInMemoryScrolling({ anchorScrolling: "disabled" }),
      // Clicking the room you already scrolled away from must scroll back to it
      withRouterConfig({ onSameUrlNavigation: "reload" }),
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      // Registering late keeps the worker out of the first paint
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
