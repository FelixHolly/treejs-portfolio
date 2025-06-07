import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { ButtonComponent } from "./button.component";

describe("ButtonComponent", () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create the component", () => {
    expect(component).toBeTruthy();
  });

  it('should display the default button text', () => {
    const buttonElement = fixture.debugElement.query(By.css('button'));
    expect(buttonElement.nativeElement.textContent.trim()).toBe('Click Me');
  });

  it('should display custom button text when provided', () => {
    component.name = 'Submit';
    fixture.detectChanges();
    
    const buttonElement = fixture.debugElement.query(By.css('button'));
    expect(buttonElement.nativeElement.textContent.trim()).toBe('Submit');
  });

  it('should apply custom CSS classes when provided', () => {
    component.containerClass = 'custom-class';
    fixture.detectChanges();
    
    const buttonElement = fixture.debugElement.query(By.css('button'));
    expect(buttonElement.nativeElement.classList.contains('custom-class')).toBe(true);
  });

  it('should show beam effect when isBeam is true', () => {
    component.isBeam = true;
    fixture.detectChanges();
    
    const beamElement = fixture.debugElement.query(By.css('.btn-ping'));
    expect(beamElement).toBeTruthy();
  });

  it('should not show beam effect when isBeam is false', () => {
    component.isBeam = false;
    fixture.detectChanges();
    
    const beamElement = fixture.debugElement.query(By.css('.btn-ping'));
    expect(beamElement).toBeNull();
  });

  it('should call handleClick method when clicked', () => {
    jest.spyOn(component, 'handleClick');
    const buttonElement = fixture.debugElement.query(By.css('button'));
    
    buttonElement.triggerEventHandler('click', null);
    fixture.detectChanges();
    
    expect(component.handleClick).toHaveBeenCalled();
  });

  it('should scroll to element when navigate is provided', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'test-section';
    document.body.appendChild(mockElement);
    
    const scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    
    component.navigate = '#test-section';
    component.handleClick();
    
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    
    // Cleanup
    document.body.removeChild(mockElement);
  });

  it('should not throw error when navigate selector is invalid', () => {
    component.navigate = '#non-existent';
    
    expect(() => {
      component.handleClick();
    }).not.toThrow();
  });
});
