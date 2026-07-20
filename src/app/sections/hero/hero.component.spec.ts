import { ComponentFixture, TestBed } from "@angular/core/testing";

import { HeroComponent } from "./hero.component";

describe("HeroComponent", () => {
  let component: HeroComponent;
  let fixture: ComponentFixture<HeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should render the name as the display heading", () => {
    const h1: HTMLElement | null = fixture.nativeElement.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(h1!.textContent).toContain("Felix Hollndonner");
  });

  it("should label the canvas as the Vienna lion statue", () => {
    const canvas: HTMLElement | null = fixture.nativeElement.querySelector("canvas");
    expect(canvas!.getAttribute("aria-label")).toBe(
      "3D model of a Viennese lion statue, the Vienna Löwe",
    );
  });

  it("should link the call to action to the projects section", () => {
    const cta: HTMLAnchorElement | null = fixture.nativeElement.querySelector("a[href='#projects']");
    expect(cta).toBeTruthy();
  });
});
