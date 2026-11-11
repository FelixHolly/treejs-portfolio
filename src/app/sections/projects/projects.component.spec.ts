import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ProjectsComponent } from "./projects.component";

describe("ProjectsComponent", () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should open on Küchenschelle as the first of four exhibits", () => {
    expect(component.currentProject.title).toBe("Küchenschelle");
    expect(component.exhibitLabel).toBe("Exhibit I / IV");
  });

  it("should wrap from the first exhibit back to the last", () => {
    component.handleNavigation("previous");

    expect(component.currentProject.title).toBe("GreenWave");
    expect(component.exhibitLabel).toBe("Exhibit IV / IV");
  });

  it("should label the carousel position in roman numerals", () => {
    component.selectedProjectIndex = 0;
    expect(component.exhibitLabel).toMatch(/^Exhibit I \/ [IVX]+$/);

    component.selectedProjectIndex = 1;
    expect(component.exhibitLabel).toMatch(/^Exhibit II \/ [IVX]+$/);
  });
});
