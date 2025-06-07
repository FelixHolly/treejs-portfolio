import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { TestimonialsComponent } from "./testimonials.component";

describe("TestimonialsComponent", () => {
  let component: TestimonialsComponent;
  let fixture: ComponentFixture<TestimonialsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestimonialsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestimonialsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create the component", () => {
    expect(component).toBeTruthy();
  });

  it('should display the testimonials section title', () => {
    const titleElement = fixture.debugElement.query(By.css('h3.head-text'));
    expect(titleElement.nativeElement.textContent).toContain('Testimonials');
  });

  it('should display all client reviews', () => {
    const reviewElements = fixture.debugElement.queryAll(By.css('.client-review'));
    expect(reviewElements.length).toBe(component.clientReviews.length);
  });

  it('should display review content for each testimonial', () => {
    const reviewElements = fixture.debugElement.queryAll(By.css('.client-review'));
    
    reviewElements.forEach((reviewElement, index) => {
      const review = component.clientReviews[index];
      const reviewText = reviewElement.query(By.css('p.text-white-800'));
      const reviewerName = reviewElement.query(By.css('.font-semibold'));
      const reviewerPosition = reviewElement.query(By.css('.text-white-500'));
      
      expect(reviewText.nativeElement.textContent).toContain(review.review);
      expect(reviewerName.nativeElement.textContent).toContain(review.name);
      expect(reviewerPosition.nativeElement.textContent).toContain(review.position);
    });
  });

  it('should have the correct structure for each testimonial', () => {
    const reviewElements = fixture.debugElement.queryAll(By.css('.client-review'));
    
    reviewElements.forEach((reviewElement) => {
      const contentElement = reviewElement.query(By.css('.client-content'));
      const flexContainer = contentElement.query(By.css('.flex'));
      const flexCol = flexContainer.query(By.css('.flex-col'));
      
      expect(contentElement).toBeTruthy();
      expect(flexContainer).toBeTruthy();
      expect(flexCol).toBeTruthy();
    });
  });

  it('should have the correct CSS classes applied', () => {
    const sectionElement = fixture.debugElement.query(By.css('section.c-space'));
    const clientContainer = fixture.debugElement.query(By.css('.client-container'));
    
    expect(sectionElement).toBeTruthy();
    expect(clientContainer).toBeTruthy();
    
    const reviewElements = fixture.debugElement.queryAll(By.css('.client-review'));
    reviewElements.forEach((reviewElement) => {
      const reviewText = reviewElement.query(By.css('p.text-white-800'));
      expect(reviewText).toBeTruthy();
    });
  });
});
