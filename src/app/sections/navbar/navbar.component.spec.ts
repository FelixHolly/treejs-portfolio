import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { NavbarComponent } from "./navbar.component";
import { NavItemsComponent } from "./nav-items/nav-items.component";

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

  it('should have the brand name link', () => {
    const brandLink = fixture.debugElement.query(By.css('a[href="/#home"]'));
    expect(brandLink).toBeTruthy();
    expect(brandLink.nativeElement.textContent.trim()).toBe('Felix');
  });

  it('should have a mobile menu button', () => {
    const menuButton = fixture.debugElement.query(By.css('button[aria-label="Toggle menu"]'));
    expect(menuButton).toBeTruthy();
  });

  it('should toggle mobile menu when menu button is clicked', () => {
    const menuButton = fixture.debugElement.query(By.css('button[aria-label="Toggle menu"]'));
    const mobileMenu = fixture.debugElement.query(By.css('div[class*="transition-all"]'));
    
    // Initial state (closed)
    expect(component.isOpen).toBeFalsy();
    expect(mobileMenu.classes['max-h-0']).toBeTruthy();
    
    // Click to open
    menuButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    
    // Should be open
    expect(component.isOpen).toBeTruthy();
    expect(mobileMenu.classes['max-h-screen']).toBeTruthy();
    
    // Click to close
    menuButton.triggerEventHandler('click', null);
    fixture.detectChanges();
    
    // Should be closed
    expect(component.isOpen).toBeFalsy();
    expect(mobileMenu.classes['max-h-0']).toBeTruthy();
  });

  it('should have desktop navigation', () => {
    const desktopNav = fixture.debugElement.query(By.css('nav.hidden'));
    expect(desktopNav).toBeTruthy();
    
    const navItems = desktopNav.query(By.directive(NavItemsComponent));
    expect(navItems).toBeTruthy();
  });

  it('should have mobile navigation', () => {
    const mobileNav = fixture.debugElement.query(By.css('div[class*="transition-all"]'));
    expect(mobileNav).toBeTruthy();
    
    const navItems = mobileNav.query(By.directive(NavItemsComponent));
    expect(navItems).toBeTruthy();
  });

  it('should close mobile menu when a nav item is clicked', () => {
    // Open the menu
    component.isOpen = true;
    fixture.detectChanges();
    
    // Find the nav items component in the mobile menu
    const mobileMenu = fixture.debugElement.query(By.css('div[class*="transition-all"]'));
    const navItemsComponent = mobileMenu.query(By.directive(NavItemsComponent));
    expect(navItemsComponent).toBeTruthy();
    
    // Find and click the first nav item link
    const navItemLink = navItemsComponent.query(By.css('a'));
    expect(navItemLink).toBeTruthy();
    
    // Create a mock event with preventDefault
    const mockEvent = { preventDefault: jest.fn() };
    
    // Trigger the click handler with the mock event
    navItemLink.triggerEventHandler('click', mockEvent);
    fixture.detectChanges();
    
    // The menu should be closed
    expect(component.isOpen).toBeFalsy();
  });
});
