import { ErrorHandler, Injectable, inject } from "@angular/core";
import { NotificationService } from "../notification/notification.service";

interface Notice {
  title: string;
  message: string;
}

/** Checked in order: a failed lazy chunk also reads like a network error, so it is asked first. */
const KNOWN: readonly (Notice & { matches: RegExp })[] = [
  {
    matches: /loading chunk|dynamically imported module|importing a module script failed/i,
    title: "Loading Error",
    message: "Failed to load application resources. Please refresh the page.",
  },
  {
    matches: /webgl|three|gltf|texture|shader/i,
    title: "3D Graphics Error",
    message: "Failed to load 3D content. Please refresh the page.",
  },
  {
    matches: /network|fetch|http|timeout/i,
    title: "Network Error",
    message: "Connection issue detected. Please check your internet connection.",
  },
];

const UNEXPECTED: Notice = {
  title: "Unexpected Error",
  message: "Something went wrong. Please try again or refresh the page.",
};

/** Logs every unhandled error and tells the visitor about it in plain words. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notifications = inject(NotificationService);

  handleError(error: unknown): void {
    console.error("Global error caught:", error);

    const text = describe(error);
    const { title, message } = KNOWN.find((known) => known.matches.test(text)) ?? UNEXPECTED;
    this.notifications.showError(title, message);
  }
}

/** Anything can be thrown: an Error, a string, or a plain object that only carries a message. */
function describe(error: unknown): string {
  if (typeof error === "string") return error;
  if (typeof error !== "object" || error === null) return "";
  const { name, message } = error as { name?: unknown; message?: unknown };
  return [name, message].filter((part) => typeof part === "string").join(" ");
}
