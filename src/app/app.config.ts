import { ApplicationConfig, ErrorHandler, isDevMode, provideExperimentalZonelessChangeDetection } from "@angular/core";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { provideServiceWorker } from "@angular/service-worker";

import { routes } from "./app.routes";
import { GlobalErrorHandler } from "./core/error-handler/global-error-handler.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    // Old deep links (/#projects) must land on their room once the lazy page has rendered
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: "enabled" })),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      // Registering late keeps the worker out of the first paint
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
