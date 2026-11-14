import { TestBed } from "@angular/core/testing";
import { WorksService } from "./works.service";

describe("WorksService", () => {
  let service: WorksService;

  beforeEach(() => {
    service = TestBed.inject(WorksService);
  });

  it("hangs Küchenschelle first, then the two studies", () => {
    expect(service.works().map((work) => work.slug)).toEqual(["kuechenschelle", "wheelwallet", "reloo"]);
  });

  it("presents Küchenschelle as the commission with its live site and outcome", () => {
    const first = service.works()[0];

    expect(first.kind).toBe("commission");
    expect(first.href).toBe("https://kuechenschelle.at");
    expect(first.outcome).toBeTruthy();
    expect(first.images.length).toBe(3);
  });

  it("gives studies no live link, code link or outcome", () => {
    for (const study of service.works().filter((work) => work.kind === "study")) {
      expect(study.href).withContext(study.slug).toBeUndefined();
      expect(study.repo).withContext(study.slug).toBeUndefined();
      expect(study.outcome).withContext(study.slug).toBeUndefined();
    }
  });

  it("uses each slug once", () => {
    const slugs = service.works().map((work) => work.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("finds a work by slug and returns undefined for unknown slugs", () => {
    expect(service.bySlug("reloo")?.title).toBe("ReLoo");
    expect(service.bySlug("greenwave")).toBeUndefined();
    expect(service.bySlug("")).toBeUndefined();
  });

  it("ships every image it references, each with alt text and a caption", async () => {
    for (const image of service.works().flatMap((work) => work.images)) {
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
