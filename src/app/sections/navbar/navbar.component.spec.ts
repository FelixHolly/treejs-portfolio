import { ComponentFixture, TestBed } from "@angular/core/testing";

import { NavbarComponent } from "./navbar.component";

describe("NavbarComponent", () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should render the wordmark in the display face", () => {
    const wordmark: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector("a[href='/#home']");
    expect(wordmark).toBeTruthy();
    expect(wordmark!.classList.contains("font-display")).toBeTrue();
    expect(wordmark!.textContent!.trim()).toBe("Felix Hollndonner");
  });
});
