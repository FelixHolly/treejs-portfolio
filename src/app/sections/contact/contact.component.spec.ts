import {ComponentFixture, fakeAsync, TestBed, tick} from "@angular/core/testing";
import {FormsModule, NgForm} from "@angular/forms";
import {ContactComponent} from "./contact.component";
import emailjs from "@emailjs/browser";

// Mock emailjs
jest.mock('@emailjs/browser', () => ({
  send: jest.fn()
}));

// Setup fake timers
jest.useFakeTimers();

describe("ContactComponent", () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;
  let emailjsMock: jest.Mocked<typeof emailjs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Setup emailjs mock
    emailjsMock = emailjs as jest.Mocked<typeof emailjs>;
    emailjsMock.send.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });
  
  afterAll(() => {
    jest.useRealTimers();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.form).toEqual({
      name: '',
      email: '',
      message: ''
    });
    expect(component.loading()).toBe(false);
    expect(component.alert()).toEqual({ show: false, text: '', type: 'success' });
  });

  it('should mark form as invalid when empty', () => {
    // Create a mock form
    const mockForm = {
      valid: false,
      controls: {
        name: { markAsTouched: jest.fn() },
        email: { markAsTouched: jest.fn() },
        message: { markAsTouched: jest.fn() }
      },
      resetForm: jest.fn()
    } as unknown as NgForm;

    // Assign the mock form to the component
    component.contactFormRef = mockForm;

    // Trigger form submission
    component.handleSubmit();

    // Verify form validation
    expect(mockForm.controls["name"].markAsTouched).toHaveBeenCalled();
    expect(mockForm.controls["email"].markAsTouched).toHaveBeenCalled();
    expect(mockForm.controls["message"].markAsTouched).toHaveBeenCalled();

    // Verify alert is shown
    expect(component.alert()).toEqual({
      show: true,
      text: 'Please fill out all required fields.',
      type: 'danger'
    });
  });

  it('should handle successful form submission', fakeAsync(() => {
    // Create a valid mock form
    const mockForm = {
      valid: true,
      controls: {
        name: { markAsTouched: jest.fn() },
        email: { markAsTouched: jest.fn() },
        message: { markAsTouched: jest.fn() }
      },
      resetForm: jest.fn()
    } as unknown as NgForm;

    // Setup mock response
    const mockResponse = { status: 200, text: 'OK' };
    emailjsMock.send.mockResolvedValueOnce(mockResponse);

    // Set form values
    component.form = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Hello, this is a test message'
    };

    // Assign the mock form to the component
    component.contactFormRef = mockForm;

    // Trigger form submission
    component.handleSubmit();

    // Should set loading to true
    expect(component.loading()).toBe(true);

    // Wait for the promise to resolve
    tick();

    // Should set loading to false after response
    expect(component.loading()).toBe(false);

    // Should show success alert
    expect(component.alert()).toEqual({
      show: true,
      text: 'Thank you for your message 😃',
      type: 'success'
    });

    // Should reset the form
    expect(mockForm.resetForm).toHaveBeenCalled();

    // Fast-forward until all timers have been executed
    jest.advanceTimersByTime(3000);
    tick(3000);

    // Should hide the alert after timeout
    expect(component.alert().show).toBe(false);
  }));

  it('should handle form submission error', fakeAsync(() => {
    // Create a valid mock form
    const mockForm = {
      valid: true,
      controls: {
        name: { markAsTouched: jest.fn() },
        email: { markAsTouched: jest.fn() },
        message: { markAsTouched: jest.fn() }
      },
      resetForm: jest.fn()
    } as unknown as NgForm;

    // Setup mock error
    const mockError = new Error('Failed to send email');
    emailjsMock.send.mockRejectedValueOnce(mockError);

    // Set form values
    component.form = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Hello, this is a test message'
    };

    // Assign the mock form to the component
    component.contactFormRef = mockForm;

    // Spy on console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Trigger form submission
    component.handleSubmit();

    // Should set loading to true
    expect(component.loading()).toBe(true);

    // Wait for the promise to reject
    tick();

    // Should log the error
    expect(consoleSpy).toHaveBeenCalledWith(mockError);

    // Should set loading to false after error
    expect(component.loading()).toBe(false);

    // Should show error alert
    expect(component.alert()).toEqual({
      show: true,
      text: 'I didn\'t receive your message 😢',
      type: 'danger'
    });

    // Should not reset the form on error
    expect(mockForm.resetForm).not.toHaveBeenCalled();

    // Clean up the spy
    consoleSpy.mockRestore();
  }));

  it('should not submit when form is invalid', () => {
    // Create an invalid mock form
    // Assign the mock form to the component
    component.contactFormRef = {
      valid: false,
      controls: {
        name: {markAsTouched: jest.fn()},
        email: {markAsTouched: jest.fn()},
        message: {markAsTouched: jest.fn()}
      },
      resetForm: jest.fn()
    } as unknown as NgForm;
    
    // Trigger form submission
    component.handleSubmit();
    
    // Should not call emailjs.send
    expect(emailjsMock.send).not.toHaveBeenCalled();
    
    // Should show validation error
    expect(component.alert().show).toBe(true);
    expect(component.alert().type).toBe('danger');
  });
});
