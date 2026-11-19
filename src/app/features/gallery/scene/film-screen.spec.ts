import { Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Texture, VideoTexture } from "three";
import { FilmScreen } from "./film-screen";

/** A video the spec can steer: it never touches the network, and plays or refuses as told. */
function fakeVideo(options: { supported?: boolean; refuse?: DOMException } = {}): HTMLVideoElement {
  const video = document.createElement("video");
  let paused = true;
  Object.defineProperty(video, "paused", { get: () => paused });
  Object.defineProperty(video, "videoWidth", { get: () => 1280 });
  Object.defineProperty(video, "videoHeight", { get: () => 800 });
  // The real setter would start a download
  Object.defineProperty(video, "src", { writable: true, value: "" });
  spyOn(video, "canPlayType").and.returnValue(options.supported === false ? "" : "maybe");
  spyOn(video, "load");
  spyOn(video, "play").and.callFake(() => {
    paused = false;
    if (!options.refuse) return Promise.resolve();
    paused = true;
    return Promise.reject(options.refuse);
  });
  spyOn(video, "pause").and.callFake(() => {
    paused = true;
  });
  return video;
}

describe("FilmScreen", () => {
  let picture: Mesh<PlaneGeometry, MeshBasicMaterial>;
  let changed: jasmine.Spy;
  let lost: jasmine.Spy;
  let create: jasmine.Spy;
  let video: HTMLVideoElement;
  let screen: FilmScreen;

  function build(options: Parameters<typeof fakeVideo>[0] = {}): void {
    video = fakeVideo(options);
    create = spyOn(document, "createElement").withArgs("video").and.returnValue(video);
    create.and.callThrough();
    picture = new Mesh(new PlaneGeometry(2.4, 1.5), new MeshBasicMaterial({ color: 0x1b1b1f }));
    changed = jasmine.createSpy("changed");
    lost = jasmine.createSpy("lost");
    screen = new FilmScreen(picture, "assets/works/film.webm", 1.6, changed, lost);
  }

  afterEach(() => screen.dispose());

  it("creates and fetches nothing until it is first asked to play", () => {
    build();

    expect(create).not.toHaveBeenCalled();
    expect(screen.playing).toBeFalse();

    screen.pause();
    expect(create).not.toHaveBeenCalled();
  });

  it("opens a silent, looping, inline video of the film on the first play", () => {
    build();

    screen.play();

    expect(create).toHaveBeenCalledOnceWith("video");
    expect(video.src).toBe("assets/works/film.webm");
    expect(video.muted).toBeTrue();
    expect(video.loop).toBeTrue();
    expect(video.playsInline).toBeTrue();
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(screen.playing).toBeTrue();
  });

  it("reuses the one video and does not restart a film that is already running", () => {
    build();

    screen.play();
    screen.play();

    expect(create).toHaveBeenCalledTimes(1);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("keeps the still in the frame until the film's first frame arrives", () => {
    build();
    const still = new Texture();
    screen.hangStill(still);

    screen.play();

    expect(picture.material.map).toBe(still);
  });

  it("hangs the film in the still's place once it is playing, in the same colour space and uncropped", () => {
    build();
    screen.hangStill(new Texture());
    screen.play();

    video.dispatchEvent(new Event("playing"));

    const map = picture.material.map as VideoTexture;
    expect(map.isVideoTexture).toBeTrue();
    expect(map.image).toBe(video);
    expect(map.colorSpace).toBe(SRGBColorSpace);
    expect(map.repeat.x).toBeCloseTo(1, 6);
    expect(map.repeat.y).toBeCloseTo(1, 6);
    expect(picture.material.color.getHex()).toBe(0xdedede);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("makes one texture however often the film resumes", () => {
    build();
    screen.play();
    video.dispatchEvent(new Event("playing"));
    const first = picture.material.map;

    screen.pause();
    screen.play();
    video.dispatchEvent(new Event("playing"));

    expect(picture.material.map).toBe(first);
  });

  it("stays on its last frame when paused, and resumes", () => {
    build();
    screen.play();
    video.dispatchEvent(new Event("playing"));
    const film = picture.material.map;

    screen.pause();

    expect(screen.playing).toBeFalse();
    expect(picture.material.map).toBe(film);

    screen.play();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(screen.playing).toBeTrue();
  });

  it("does not let a still that arrives late cover a film already showing", () => {
    build();
    screen.play();
    video.dispatchEvent(new Event("playing"));
    const film = picture.material.map;

    screen.hangStill(new Texture());

    expect(picture.material.map).toBe(film);
  });

  it("leaves the still alone, without a word, when the browser cannot play the format", () => {
    build({ supported: false });
    const still = new Texture();
    screen.hangStill(still);

    screen.play();
    screen.play();

    expect(video.play).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.playing).toBeFalse();
    expect(picture.material.map).toBe(still);
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it("goes back to the still when the film fails to load", () => {
    build();
    const still = new Texture();
    screen.hangStill(still);
    screen.play();

    video.dispatchEvent(new Event("error"));

    expect(screen.playing).toBeFalse();
    expect(picture.material.map).toBe(still);
    expect(changed).toHaveBeenCalled();
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it("lets go of the file as soon as the film is lost, not only when the gallery closes", () => {
    build();
    screen.play();

    video.dispatchEvent(new Event("error"));

    expect(video.pause).toHaveBeenCalled();
    expect(video.load).toHaveBeenCalledTimes(1);
  });

  it("leaves the frame empty rather than on a freed texture when the film fails before any still arrived", () => {
    build();
    screen.play();
    video.dispatchEvent(new Event("playing"));
    const freed = jasmine.createSpy("freed");
    picture.material.map!.addEventListener("dispose", freed);

    video.dispatchEvent(new Event("error"));

    expect(freed).toHaveBeenCalledTimes(1);
    expect(picture.material.map).toBeNull();

    const still = new Texture();
    screen.hangStill(still);
    expect(picture.material.map).toBe(still);
  });

  it("never says it lost a film that played without trouble", () => {
    build();
    screen.play();
    video.dispatchEvent(new Event("playing"));
    screen.pause();
    screen.play();

    expect(lost).not.toHaveBeenCalled();
  });

  it("goes back to the still when the film fails after it had started, and does not try again", () => {
    build();
    const still = new Texture();
    screen.hangStill(still);
    screen.play();
    video.dispatchEvent(new Event("playing"));

    video.dispatchEvent(new Event("error"));
    screen.play();

    expect(picture.material.map).toBe(still);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(screen.playing).toBeFalse();
  });

  it("gives up after a refused start rather than asking again on every frame", async () => {
    build({ refuse: new DOMException("not allowed", "NotAllowedError") });

    screen.play();
    await Promise.resolve();
    screen.play();
    screen.play();

    expect(video.play).toHaveBeenCalledTimes(1);
    expect(screen.playing).toBeFalse();
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it("treats a start cut short by a pause as routine and plays again later", async () => {
    build({ refuse: new DOMException("interrupted", "AbortError") });

    screen.play();
    await Promise.resolve();
    screen.play();

    expect(video.play).toHaveBeenCalledTimes(2);
    expect(lost).not.toHaveBeenCalled();
  });

  it("stops the film and lets go of the file, the texture and the still when disposed", () => {
    build();
    const still = new Texture();
    const stillFreed = jasmine.createSpy("stillFreed");
    still.addEventListener("dispose", stillFreed);
    screen.hangStill(still);
    screen.play();
    video.dispatchEvent(new Event("playing"));
    const filmFreed = jasmine.createSpy("filmFreed");
    picture.material.map!.addEventListener("dispose", filmFreed);

    screen.dispose();

    expect(video.pause).toHaveBeenCalled();
    expect(video.hasAttribute("src")).toBeFalse();
    expect(video.load).toHaveBeenCalledTimes(1);
    expect(filmFreed).toHaveBeenCalledTimes(1);
    expect(stillFreed).toHaveBeenCalledTimes(1);
    expect(screen.playing).toBeFalse();
  });

  it("ignores the video and any request to play once disposed", () => {
    build();
    screen.play();
    screen.dispose();
    changed.calls.reset();

    video.dispatchEvent(new Event("playing"));
    video.dispatchEvent(new Event("error"));
    screen.play();

    expect(picture.material.map).toBeNull();
    expect(changed).not.toHaveBeenCalled();
    expect(lost).not.toHaveBeenCalled();
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("can be disposed without ever having played", () => {
    build();

    expect(() => screen.dispose()).not.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
