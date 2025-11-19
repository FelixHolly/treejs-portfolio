/**
 * Application-level configuration for Angular standalone application.
 *
 * Key architectural decisions:
 * - Zone.js optimization: Event coalescing reduces change detection cycles
 * - Global error handler: Centralizes error handling and user notifications
 * - Service worker: Provides offline capability and asset caching in production
 *
 * Service worker strategy:
 * - Disabled in development for faster iteration and easier debugging
 * - Registers after 30s of stability to avoid impacting initial page load metrics
 * - Caches static assets for offline access and improved repeat visit performance
 */
import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection, isDevMode } from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { GlobalErrorHandler } from "./core/error-handler/global-error-handler.service";
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    // Event coalescing batches multiple events into single change detection cycle
    // Reduces overhead in event-heavy scenarios (e.g., mouse movement on 3D canvas)
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Replace default error handler with custom implementation for user-friendly notifications
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // Service worker for PWA capabilities (offline access, faster subsequent loads)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Delay registration to avoid blocking initial page load
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
};
