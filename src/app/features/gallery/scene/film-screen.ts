import { SRGBColorSpace, Texture, VideoTexture } from "three";
import { FramedPicture, hang } from "./exhibits";
import { coverFit } from "./textures";

/** Nothing is created or fetched before the first `play`, so a visitor who never reaches the work pays nothing for its film. */
export class FilmScreen {
  private video?: HTMLVideoElement;
  private texture?: VideoTexture;
  private still?: Texture;
  private failed = false;

  constructor(
    readonly picture: FramedPicture["picture"],
    private readonly src: string,
    private readonly aspect: number,
    private readonly onChange: () => void,
    private readonly onLost: () => void,
  ) {}

  /** How long the scene has to keep drawing. */
  get playing(): boolean {
    return !!this.video && !this.failed && !this.video.paused;
  }

  /** The still shows until the film's first frame, and again if the film fails. */
  hangStill(still: Texture): void {
    this.still = still;
    if (!this.texture) hang(this.picture, still);
  }

  play(): void {
    if (this.failed) return;
    this.video ??= this.open();
    if (this.video?.paused) this.video.play().catch(this.onRefused);
  }

  /** The frame it stopped on stays in the frame. */
  pause(): void {
    this.video?.pause();
  }

  dispose(): void {
    this.failed = true;
    this.release();
    this.still?.dispose();
  }

  private open(): HTMLVideoElement | undefined {
    const video = document.createElement("video");
    if (!video.canPlayType("video/webm")) {
      this.lose();
      return undefined;
    }
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.addEventListener("playing", this.onPlaying);
    video.addEventListener("error", this.lose);
    video.src = this.src;
    return video;
  }

  private release(): void {
    const video = this.video;
    if (video) {
      video.removeEventListener("playing", this.onPlaying);
      video.removeEventListener("error", this.lose);
      video.pause();
      // Without this the browser keeps the download and the decoder alive
      video.removeAttribute("src");
      video.load();
    }
    this.texture?.dispose();
    this.texture = undefined;
  }

  private readonly onPlaying = (): void => {
    const video = this.video;
    if (!video || this.texture || this.failed) return;
    this.texture = new VideoTexture(video);
    this.texture.colorSpace = SRGBColorSpace;
    coverFit(this.texture, this.aspect, video.videoWidth / video.videoHeight);
    hang(this.picture, this.texture);
    this.onChange();
  };

  /** A pause cutting a start short is routine; any other refusal would otherwise be retried on every frame. */
  private readonly onRefused = (reason: unknown): void => {
    if (!(reason instanceof DOMException && reason.name === "AbortError")) this.lose();
  };

  private readonly lose = (): void => {
    if (this.failed) return;
    this.failed = true;
    const shown = !!this.texture;
    this.release();
    if (shown && this.still) hang(this.picture, this.still);
    else if (shown) {
      this.picture.material.map = null;
      this.picture.material.needsUpdate = true;
    }
    this.onChange();
    this.onLost();
  };
}
