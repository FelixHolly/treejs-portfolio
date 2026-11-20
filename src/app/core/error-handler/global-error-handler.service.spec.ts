import { TestBed } from "@angular/core/testing";
import { NotificationService } from "../notification/notification.service";
import { GlobalErrorHandler } from "./global-error-handler.service";

describe("GlobalErrorHandler", () => {
  let handler: GlobalErrorHandler;
  let notifications: jasmine.SpyObj<NotificationService>;
  let logged: jasmine.Spy;

  const titleFor = (error: unknown): string => {
    handler.handleError(error);
    return notifications.showError.calls.mostRecent().args[0];
  };

  beforeEach(() => {
    notifications = jasmine.createSpyObj<NotificationService>("NotificationService", ["showError"]);
    logged = spyOn(console, "error");
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, { provide: NotificationService, useValue: notifications }],
    });
    handler = TestBed.inject(GlobalErrorHandler);
  });

  it("logs the error itself and tells the visitor once", () => {
    const error = new Error("boom");

    handler.handleError(error);

    expect(logged).toHaveBeenCalledOnceWith("Global error caught:", error);
    expect(notifications.showError).toHaveBeenCalledOnceWith(
      "Unexpected Error",
      "Something went wrong. Please try again or refresh the page.",
    );
  });

  it("knows a lazy chunk that failed to load in each browser's own words", () => {
    expect(titleFor(new TypeError("Failed to fetch dynamically imported module: https://x/chunk-A.js"))).toBe("Loading Error");
    expect(titleFor(new TypeError("error loading dynamically imported module"))).toBe("Loading Error");
    expect(titleFor(new TypeError("Importing a module script failed."))).toBe("Loading Error");
    expect(titleFor(new Error("Loading chunk 12 failed"))).toBe("Loading Error");
  });

  it("knows a 3D failure and a network failure", () => {
    expect(titleFor(new Error("Error creating WebGL context"))).toBe("3D Graphics Error");
    expect(titleFor(new Error("THREE.GLTFLoader: could not parse"))).toBe("3D Graphics Error");
    expect(titleFor(new TypeError("Failed to fetch"))).toBe("Network Error");
    expect(titleFor(new Error("Request timeout"))).toBe("Network Error");
  });

  it("reads an error's name as well as its message", () => {
    const error = new Error("something");
    error.name = "NetworkError";

    expect(titleFor(error)).toBe("Network Error");
  });

  it("takes whatever was thrown: a string, a plain object with a message, or nothing at all", () => {
    expect(titleFor("network down")).toBe("Network Error");
    expect(titleFor({ message: "WebGL lost" })).toBe("3D Graphics Error");
    expect(titleFor({ status: 412, text: "nope" })).toBe("Unexpected Error");
    expect(titleFor(null)).toBe("Unexpected Error");
    expect(titleFor(undefined)).toBe("Unexpected Error");
    expect(titleFor(42)).toBe("Unexpected Error");
  });
});
