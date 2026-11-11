import { TestBed } from "@angular/core/testing";

import { ProjectService } from "./project.service";

describe("ProjectService", () => {
  let service: ProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectService);
  });

  it("should present Küchenschelle first, then the earlier projects in their original order", () => {
    const titles = service.getProjects().map((project) => project.title);

    expect(titles).toEqual(["Küchenschelle", "WheelWallet", "ReLoo", "GreenWave"]);
  });

  it("should link Küchenschelle to its live site and screenshot", () => {
    const first = service.getProjectByIndex(0);

    expect(first?.href).toBe("https://kuechenschelle.at");
    expect(first?.texture).toBe("assets/textures/projects/kuechenschelle.webp");
  });

  it("should return undefined for indexes outside the collection", () => {
    expect(service.getProjectByIndex(-1)).toBeUndefined();
    expect(service.getProjectByIndex(service.getProjectsCount())).toBeUndefined();
  });

  it("should report a count matching the collection", () => {
    expect(service.getProjectsCount()).toBe(service.getProjects().length);
  });

  describe("every project", () => {
    it("should point its texture at a webp in the projects texture folder", () => {
      for (const project of service.getProjects()) {
        expect(project.texture)
          .withContext(project.title)
          .toMatch(/^assets\/textures\/projects\/[\w-]+\.webp$/);
      }
    });

    it("should ship its texture so the frame never hangs on the loading overlay", async () => {
      for (const project of service.getProjects()) {
        const response = await fetch(project.texture);

        expect(response.ok).withContext(project.texture).toBeTrue();
      }
    });

    it("should link to a live site over https", () => {
      for (const project of service.getProjects()) {
        expect(project.href).withContext(project.title).toMatch(/^https:\/\/\S+$/);
      }
    });

    it("should list at least one tag, each named once", () => {
      for (const project of service.getProjects()) {
        const names = project.tags.map((tag) => tag.name);

        expect(names.length).withContext(project.title).toBeGreaterThan(0);
        expect(new Set(names).size).withContext(project.title).toBe(names.length);
      }
    });
  });
});
