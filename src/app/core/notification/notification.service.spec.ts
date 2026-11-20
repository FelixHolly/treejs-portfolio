import { TestBed } from "@angular/core/testing";
import { NotificationService } from "./notification.service";

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(() => {
    jasmine.clock().install();
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => jasmine.clock().uninstall());

  it("starts with nothing to say", () => {
    expect(service.notification()).toBeNull();
  });

  it("shows a notice as information unless told otherwise", () => {
    service.showNotification("FYI", "Something happened.");

    expect(service.notification()).toEqual({ title: "FYI", message: "Something happened.", type: "info" });
  });

  it("names each kind of notice", () => {
    service.showSuccess("a", "b");
    expect(service.notification()?.type).toBe("success");
    service.showWarning("a", "b");
    expect(service.notification()?.type).toBe("warning");
    service.showInfo("a", "b");
    expect(service.notification()?.type).toBe("info");
    service.showError("a", "b");
    expect(service.notification()?.type).toBe("error");
  });

  it("takes a notice down after five seconds and an error after seven", () => {
    service.showInfo("FYI", "Something happened.");
    jasmine.clock().tick(4999);
    expect(service.notification()).not.toBeNull();
    jasmine.clock().tick(1);
    expect(service.notification()).toBeNull();

    service.showError("Broken", "Reload.");
    jasmine.clock().tick(6999);
    expect(service.notification()).not.toBeNull();
    jasmine.clock().tick(1);
    expect(service.notification()).toBeNull();
  });

  it("gives a notice that replaces another its own full time", () => {
    service.showInfo("First", "One.");
    jasmine.clock().tick(4000);
    service.showInfo("Second", "Two.");

    jasmine.clock().tick(1500);
    expect(service.notification()?.title).withContext("past the first notice's time").toBe("Second");
    jasmine.clock().tick(3500);
    expect(service.notification()).toBeNull();
  });

  it("does not let a dismissed notice's timer take down the next one", () => {
    service.showInfo("First", "One.");
    service.clearNotification();
    jasmine.clock().tick(4000);
    service.showError("Second", "Two.");

    jasmine.clock().tick(1500);
    expect(service.notification()?.title).toBe("Second");
  });

  it("is safe to clear when nothing shows", () => {
    expect(() => service.clearNotification()).not.toThrow();
    expect(service.notification()).toBeNull();
  });
});
