import { ErrorHandler, Injectable, inject } from "@angular/core";
import { NotificationService } from "../../services/notification.service";

/**
 * Global error handler that catches unhandled errors and displays user-friendly notifications
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private notificationService = inject(NotificationService);

  handleError(error: Error): void {
    console.error("Global error caught:", error);

    if (this.isThreeJsError(error)) {
      this.notificationService.showError(
        "3D Graphics Error",
        "Failed to load 3D content. Please refresh the page."
      );
    } else if (this.isNetworkError(error)) {
      this.notificationService.showError(
        "Network Error",
        "Connection issue detected. Please check your internet connection."
      );
    } else if (this.isChunkLoadError(error)) {
      this.notificationService.showError(
        "Loading Error",
        "Failed to load application resources. Please refresh the page."
      );
    } else {
      this.notificationService.showError(
        "Unexpected Error",
        "Something went wrong. Please try again or refresh the page."
      );
    }
  }

  private isThreeJsError(error: Error): boolean {
    const threeJsKeywords = ["WebGL", "THREE", "GLTF", "model", "texture", "shader"];
    return threeJsKeywords.some((keyword) =>
      error.message?.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isNetworkError(error: Error): boolean {
    const networkKeywords = ["network", "fetch", "http", "timeout"];
    return networkKeywords.some((keyword) =>
      error.message?.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private isChunkLoadError(error: Error): boolean {
    return error.message?.toLowerCase().includes("chunk") ?? false;
  }
}
