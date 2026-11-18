import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ViewEnvironment } from "../../core/view-mode/view-environment";
import { ViewModeService } from "../../core/view-mode/view-mode.service";
import { FakeViewEnvironment } from "../../testing/fake-view-environment";
import { ViewSwitchComponent } from "./view-switch.component";

describe("ViewSwitchComponent", () => {
  let fixture: ComponentFixture<ViewSwitchComponent>;
  let environment: FakeViewEnvironment;
  let viewMode: ViewModeService;

  beforeEach(() => {
    environment = new FakeViewEnvironment();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ViewEnvironment, useValue: environment }],
    });
    viewMode = TestBed.inject(ViewModeService);
    fixture = TestBed.createComponent(ViewSwitchComponent);
  });

  const button = () => fixture.nativeElement.querySelector("button") as HTMLButtonElement | null;

  it("offers the gallery from the catalogue", () => {
    fixture.detectChanges();

    expect(button()?.textContent?.trim()).toBe("Enter the gallery");
  });

  it("offers the catalogue from the gallery", () => {
    viewMode.active.set("gallery");
    fixture.detectChanges();

    expect(button()?.textContent?.trim()).toBe("Read the catalogue");
  });

  it("does not offer a gallery the browser cannot show", () => {
    environment.webgl = false;
    fixture.detectChanges();

    expect(button()).toBeNull();
  });

  it("always offers the way back to the catalogue, even without WebGL", () => {
    environment.webgl = false;
    viewMode.active.set("gallery");
    fixture.detectChanges();

    expect(button()?.textContent?.trim()).toBe("Read the catalogue");
  });

  it("switches to the offered view when pressed", () => {
    const switchTo = spyOn(viewMode, "switchTo").and.resolveTo(true);
    fixture.detectChanges();

    button()!.click();

    expect(switchTo).toHaveBeenCalledOnceWith("gallery");
  });
});
