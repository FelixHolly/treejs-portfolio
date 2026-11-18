
import { inject, Injectable, DOCUMENT } from "@angular/core";

const STORAGE_KEY = "fh.view";

interface ConnectionHint {
  connection?: { saveData?: boolean };
}

/** Everything the view choice reads from the browser, behind one seam. */
@Injectable({ providedIn: "root" })
export class ViewEnvironment {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView as (Window & typeof globalThis) | null;

  /** Only asks whether the browser has WebGL at all; creating a context to be sure would delay the first paint. */
  hasWebGL(): boolean {
    return typeof this.window?.WebGLRenderingContext === "function";
  }

  prefersReducedMotion(): boolean {
    return this.matches("(prefers-reduced-motion: reduce)");
  }

  hasFinePointer(): boolean {
    return this.matches("(pointer: fine)");
  }

  savesData(): boolean {
    return (this.window?.navigator as (Navigator & ConnectionHint) | undefined)?.connection?.saveData === true;
  }

  viewport(): { width: number; height: number } {
    return { width: this.window?.innerWidth ?? 0, height: this.window?.innerHeight ?? 0 };
  }

  storedChoice(): string | null {
    try {
      return this.window?.localStorage.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  storeChoice(mode: string): void {
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Private browsing may refuse storage; the choice then lasts for this visit only.
    }
  }

  private matches(query: string): boolean {
    return this.window?.matchMedia?.(query).matches ?? false;
  }
}
