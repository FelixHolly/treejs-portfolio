import { TestBed } from "@angular/core/testing";
import { WorksService } from "./works.service";

describe("WorksService", () => {
  let service: WorksService;

  beforeEach(() => {
    service = TestBed.inject(WorksService);
  });

  it("hangs Küchenschelle first, then the two studies, then the gallery itself", () => {
    expect(service.works().map((work) => work.slug)).toEqual(["kuechenschelle", "wheelwallet", "reloo", "this-gallery"]);
  });

  it("presents Küchenschelle as the commission with its live site and outcome", () => {
    const first = service.works()[0];

    expect(first.kind).toBe("commission");
    expect(first.href).toBe("https://kuechenschelle.at");
    expect(first.outcome).toBeTruthy();
    expect(first.images.length).toBe(3);
  });

  it("gives studies no live link, code link or outcome", () => {
    const studies = service.works().filter((work) => work.kind === "study");

    expect(studies.length).toBe(2);
    for (const study of studies) {
      expect(study.href).withContext(study.slug).toBeUndefined();
      expect(study.repo).withContext(study.slug).toBeUndefined();
      expect(study.outcome).withContext(study.slug).toBeUndefined();
    }
  });

  it("presents this gallery as the one self-portrait: finished, its code public, no live link", () => {
    const selfPortraits = service.works().filter((work) => work.kind === "self-portrait");
    const [gallery] = selfPortraits;

    expect(selfPortraits.length).toBe(1);
    expect(gallery.slug).toBe("this-gallery");
    expect(gallery.title).toBe("This Gallery");
    expect(gallery.repo).toBe("https://github.com/FelixHolly/treejs-portfolio");
    expect(gallery.href).toBeUndefined();
    expect(gallery.outcome).toBeTruthy();
    expect(gallery.materials).toEqual(["Angular", "Three.js", "TypeScript"]);
  });

  it("shows this gallery in one wide picture, with two more for the closer look", () => {
    const gallery = service.bySlug("this-gallery")!;
    const pictures = [...gallery.images, ...(gallery.detailImages ?? [])];

    expect(gallery.images.length).toBe(1);
    expect(pictures.map((image) => image.src)).toEqual([
      "assets/works/this-gallery-entrance.webp",
      "assets/works/this-gallery-room-1.webp",
      "assets/works/this-gallery-room-4.webp",
    ]);
    expect(pictures.every((image) => image.orientation === "landscape")).toBeTrue();
    expect(pictures.map((image) => image.caption)).toEqual(["Self-portrait · Entrance", "Fig. II · Room I", "Fig. III · Room IV"]);
  });

  it("uses each slug once", () => {
    const slugs = service.works().map((work) => work.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("finds a work by slug and returns undefined for unknown slugs", () => {
    expect(service.bySlug("reloo")?.title).toBe("ReLoo");
    expect(service.bySlug("this-gallery")?.kind).toBe("self-portrait");
    expect(service.bySlug("greenwave")).toBeUndefined();
    expect(service.bySlug("")).toBeUndefined();
  });

  it("ships every image it references, in the closer look too, each with alt text and a caption", async () => {
    const images = service.works().flatMap((work) => [...work.images, ...(work.detailImages ?? [])]);

    expect(new Set(images.map((image) => image.src)).size).toBe(images.length);
    for (const image of images) {
      const response = await fetch(image.src);

      expect(response.ok).withContext(image.src).toBeTrue();
      expect(image.alt.trim().length).withContext(image.src).toBeGreaterThan(10);
      expect(image.caption.trim()).withContext(image.src).not.toBe("");
    }
  });

  it("keeps the copy free of em dashes", () => {
    expect(JSON.stringify(service.works())).not.toContain("—");
  });
});
