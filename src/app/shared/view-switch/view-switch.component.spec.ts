import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ViewEnvironment } from "../../core/view-mode/view-environment";
import { ViewModeService } from "../../core/view-mode/view-mode.service";
import { FakeViewEnvironment } from "../../core/view-mode/fake-view-environment";
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
  const text = () => button()?.textContent?.replace(/\s+/g, " ").trim();

  it("offers the gallery from the catalogue", () => {
    fixture.detectChanges();

    expect(text()).toBe("Enter the gallery");
    expect(button()?.getAttribute("aria-label")).toBe("Enter the gallery");
  });

  it("offers the catalogue from the gallery", () => {
    viewMode.active.set("gallery");
    fixture.detectChanges();

    expect(text()).toBe("Read the catalogue");
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

    expect(text()).toBe("Read the catalogue");
  });

  it("keeps the full label unless asked to be compact, and then still names itself in full", () => {
    fixture.detectChanges();
    expect(button()?.querySelector("span")?.classList.contains("max-sm:hidden")).toBeFalse();

    fixture.componentRef.setInput("compact", true);
    fixture.detectChanges();
    expect(button()?.querySelector("span")?.classList.contains("max-sm:hidden")).toBeTrue();
    expect(button()?.getAttribute("aria-label")).toBe("Enter the gallery");
  });

  it("switches to the offered view when pressed", () => {
    const switchTo = spyOn(viewMode, "switchTo").and.resolveTo(true);
    fixture.detectChanges();

    button()!.click();

    expect(switchTo).toHaveBeenCalledOnceWith("gallery");
  });
});
