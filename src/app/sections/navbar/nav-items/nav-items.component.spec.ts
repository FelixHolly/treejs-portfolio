import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { NavItemsComponent } from "./nav-items.component";

describe("NavItemsComponent", () => {
  let component: NavItemsComponent;
  let fixture: ComponentFixture<NavItemsComponent>;

  const expectedNavItems = [
    { id: "home", name: "Home", href: "#home" },
    { id: "about", name: "About", href: "#about" },
    { id: "projects", name: "Projects", href: "#projects" },
    { id: "contact", name: "Contact", href: "#contact" },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavItemsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NavItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it('should have the correct navigation items', () => {
    expect(component.navLinks).toEqual(expectedNavItems);
  });

  it('should render all navigation links', () => {
    const navItems = fixture.debugElement.queryAll(By.css('.nav-li'));
    expect(navItems.length).toBe(expectedNavItems.length);

    navItems.forEach((item, index) => {
      const link = item.query(By.css('a'));
      expect(link.nativeElement.textContent.trim()).toBe(expectedNavItems[index].name);
      expect(link.attributes['href']).toBe(expectedNavItems[index].href);
    });
  });

  it('should emit onClick event when a link is clicked', () => {
    // Create a mock function for the emit method
    component.onClick.emit = jest.fn();
    const firstLink = fixture.debugElement.query(By.css('.nav-li_a'));

    // Trigger the click event
    firstLink.triggerEventHandler('click', {
      preventDefault: () => {} // Mock preventDefault function
    });

    // Verify the emit was called
    expect(component.onClick.emit).toHaveBeenCalled();
  });
});
