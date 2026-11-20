import { ViewEnvironment } from "./view-environment";

/** A browser the specs can shape: by default a capable desktop with nothing stored. */
export class FakeViewEnvironment implements Pick<
  ViewEnvironment,
  "hasWebGL" | "prefersReducedMotion" | "hasFinePointer" | "savesData" | "viewport" | "storedChoice" | "storeChoice"
> {
  webgl = true;
  reducedMotion = false;
  finePointer = true;
  dataSaver = false;
  size = { width: 1440, height: 900 };
  stored: string | null = null;

  hasWebGL(): boolean {
    return this.webgl;
  }
  prefersReducedMotion(): boolean {
    return this.reducedMotion;
  }
  hasFinePointer(): boolean {
    return this.finePointer;
  }
  savesData(): boolean {
    return this.dataSaver;
  }
  viewport(): { width: number; height: number } {
    return this.size;
  }
  storedChoice(): string | null {
    return this.stored;
  }
  storeChoice(mode: string): void {
    this.stored = mode;
  }
}
