import '@angular/localize/init';
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

declare const global: any;

// Add browser globals
(global as any).Date = Date;
(global as any).requestAnimationFrame = (callback: FrameRequestCallback) => setTimeout(callback, 0);
(global as any).cancelAnimationFrame = (id: number) => clearTimeout(id);

// Initialize the Angular testing environment only once
const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
    { teardown: { destroyAfterEach: false } }
  );
}
