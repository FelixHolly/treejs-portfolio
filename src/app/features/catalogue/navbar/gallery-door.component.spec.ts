import { provideLocationMocks } from "@angular/common/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ViewEnvironment } from "../../../core/view-mode/view-environment";
import { ViewModeService } from "../../../core/view-mode/view-mode.service";
import { FakeViewEnvironment } from "../../../testing/fake-view-environment";
import { GalleryDoorComponent } from "./gallery-door.component";

describe("GalleryDoorComponent", () => {
  let fixture: ComponentFixture<GalleryDoorComponent>;
  let environment: FakeViewEnvironment;

  beforeEach(() => {
    environment = new FakeViewEnvironment();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideLocationMocks(), { provide: ViewEnvironment, useValue: environment }],
    });
    fixture = TestBed.createComponent(GalleryDoorComponent);
  });

  const button = () => (fixture.nativeElement as HTMLElement).querySelector("button");

  it("names the gallery for what it is, the 3D view", () => {
    fixture.detectChanges();

    expect(button()?.textContent?.trim()).toBe("Walk the 3D gallery");
    expect(button()?.type).toBe("button");
  });

  it("is a target a thumb can hit", () => {
    fixture.detectChanges();

    expect(button()!.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });

  it("switches to the gallery when pressed", () => {
    const switchTo = spyOn(TestBed.inject(ViewModeService), "switchTo").and.resolveTo(true);
    fixture.detectChanges();

    button()!.click();

    expect(switchTo).toHaveBeenCalledOnceWith("gallery");
  });

  it("offers nothing where the browser cannot show a gallery, and then takes up no room", () => {
    environment.webgl = false;
    fixture.detectChanges();

    expect(button()).toBeNull();
    expect(getComputedStyle(fixture.nativeElement as HTMLElement).display).toBe("none");
  });
});
