import { ComponentFixture, TestBed } from "@angular/core/testing";
import { WorkFilm } from "../../core/content/work.model";
import { WorkFilmComponent } from "./work-film.component";

const FILM: WorkFilm = { src: "assets/works/piece-film.webm", description: "A visit to the site, from home page to recipe." };

describe("WorkFilmComponent", () => {
  let fixture: ComponentFixture<WorkFilmComponent>;
  let video: HTMLVideoElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkFilmComponent);
    fixture.componentRef.setInput("film", FILM);
    fixture.componentRef.setInput("poster", "assets/works/piece.webp");
    fixture.detectChanges();
    video = fixture.nativeElement.querySelector("video");
  });

  it("shows the film with the browser's own controls", () => {
    expect(video.controls).toBeTrue();
    expect(video.getAttribute("src")).toBe(FILM.src);
  });

  it("never starts by itself and fetches nothing until the visitor asks", () => {
    expect(video.autoplay).toBeFalse();
    expect(video.hasAttribute("autoplay")).toBeFalse();
    expect(video.loop).toBeFalse();
    expect(video.preload).toBe("none");
    expect(video.paused).toBeTrue();
  });

  it("is silent and stays in the page on a phone", () => {
    expect(video.muted).toBeTrue();
    expect(video.hasAttribute("muted")).toBeTrue();
    expect(video.hasAttribute("playsinline")).toBeTrue();
  });

  it("stands on a still until played, and says what it shows to those who cannot watch", () => {
    expect(video.getAttribute("poster")).toBe("assets/works/piece.webp");
    expect(video.getAttribute("aria-label")).toBe(FILM.description);
  });

  it("is captioned as a film", () => {
    const figure: HTMLElement = fixture.nativeElement.querySelector("figure");

    expect(figure.contains(video)).toBeTrue();
    expect(figure.querySelector("figcaption")?.textContent).toContain("Film");
  });

  it("follows a change of film", () => {
    fixture.componentRef.setInput("film", { src: "assets/works/other.webm", description: "Another film." });
    fixture.detectChanges();

    expect(video.getAttribute("src")).toBe("assets/works/other.webm");
    expect(video.getAttribute("aria-label")).toBe("Another film.");
  });

  describe("where the browser cannot play the film's format", () => {
    let asked: jasmine.Spy;

    function shown(film: WorkFilm, answer: CanPlayTypeResult): boolean {
      asked = spyOn(HTMLVideoElement.prototype, "canPlayType").and.returnValue(answer);
      const other = TestBed.createComponent(WorkFilmComponent);
      other.componentRef.setInput("film", film);
      other.componentRef.setInput("poster", "assets/works/piece.webp");
      other.detectChanges();
      return !other.nativeElement.classList.contains("hidden");
    }

    it("is in the page here, where it can be played", () => {
      expect(fixture.nativeElement.classList.contains("hidden")).toBeFalse();
    });

    it("is left out, player and caption, rather than standing there doing nothing", () => {
      expect(shown(FILM, "")).toBeFalse();
      expect(asked).toHaveBeenCalledOnceWith("video/webm");
    });

    it("stays for a browser that can only say the format might play", () => {
      expect(shown(FILM, "maybe")).toBeTrue();
    });

    it("asks about the format the film is in", () => {
      expect(shown({ ...FILM, src: "assets/works/piece-film.mp4" }, "")).toBeFalse();
      expect(asked).toHaveBeenCalledOnceWith("video/mp4");
    });

    it("reads the format past a query or a fragment on the address", () => {
      expect(shown({ ...FILM, src: "assets/works/piece-film.webm?v=2#t=3" }, "")).toBeFalse();
      expect(asked).toHaveBeenCalledOnceWith("video/webm");
    });

    it("stays when the film's format is not one it knows to ask about", () => {
      expect(shown({ ...FILM, src: "assets/works/piece-film.ogv" }, "")).toBeTrue();
      expect(asked).not.toHaveBeenCalled();
    });
  });
});
