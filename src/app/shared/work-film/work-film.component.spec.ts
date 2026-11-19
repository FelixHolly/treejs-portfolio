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
});
