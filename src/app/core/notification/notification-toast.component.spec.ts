import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NotificationService } from "./notification.service";
import { NotificationToastComponent } from "./notification-toast.component";

describe("NotificationToastComponent", () => {
  let fixture: ComponentFixture<NotificationToastComponent>;
  let element: HTMLElement;
  let notifications: NotificationService;

  beforeEach(() => {
    jasmine.clock().install();
    fixture = TestBed.createComponent(NotificationToastComponent);
    element = fixture.nativeElement;
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  afterEach(() => jasmine.clock().uninstall());

  it("keeps a polite live region on the page and shows nothing until there is something to say", () => {
    const region = element.querySelector('[role="status"]')!;

    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(element.querySelector(".toast")).toBeNull();
  });

  it("shows an error with its title and message, marked as an error", () => {
    notifications.showError("Something broke", "Please reload the page.");
    fixture.detectChanges();

    const toast = element.querySelector(".toast")!;
    expect(toast.classList.contains("toast--error")).toBeTrue();
    expect(toast.querySelector("h3")?.textContent).toBe("Something broke");
    expect(toast.querySelector("p")?.textContent).toBe("Please reload the page.");
    expect(toast.querySelector(".toast-icon")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("marks only errors and warnings; other notices keep the plain look", () => {
    notifications.showWarning("Careful", "Check this.");
    fixture.detectChanges();
    expect(element.querySelector(".toast")!.className).toBe("toast toast--warning");

    notifications.showSuccess("Done", "All good.");
    fixture.detectChanges();
    expect(element.querySelector(".toast")!.className).toBe("toast");
  });

  it("goes away from its named button", () => {
    notifications.showError("Something broke", "Please reload the page.");
    fixture.detectChanges();

    const dismiss = element.querySelector<HTMLButtonElement>(".toast-close")!;
    expect(dismiss.getAttribute("aria-label")).toBe("Dismiss error notification");
    dismiss.click();
    fixture.detectChanges();

    expect(element.querySelector(".toast")).toBeNull();
  });

  it("goes away by itself, errors staying longer than other notices", () => {
    notifications.showInfo("FYI", "Something happened.");
    fixture.detectChanges();
    jasmine.clock().tick(5001);
    fixture.detectChanges();
    expect(element.querySelector(".toast")).toBeNull();

    notifications.showError("Something broke", "Please reload the page.");
    fixture.detectChanges();
    jasmine.clock().tick(5001);
    fixture.detectChanges();
    expect(element.querySelector(".toast")).not.toBeNull();
    jasmine.clock().tick(2000);
    fixture.detectChanges();
    expect(element.querySelector(".toast")).toBeNull();
  });
});
