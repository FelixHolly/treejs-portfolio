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

  it("should label the carousel position in roman numerals", () => {
    component.selectedProjectIndex = 0;
    expect(component.exhibitLabel).toMatch(/^Exhibit I \/ [IVX]+$/);

    component.selectedProjectIndex = 1;
    expect(component.exhibitLabel).toMatch(/^Exhibit II \/ [IVX]+$/);
  });
});
