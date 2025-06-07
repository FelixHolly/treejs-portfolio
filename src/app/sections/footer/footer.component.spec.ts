import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { FooterComponent } from "./footer.component";

describe("FooterComponent", () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;
  let currentYear: number;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    currentYear = new Date().getFullYear();
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it('should set the current year', () => {
    expect(component.year).toBe(currentYear.toString());
  });

  it('should display the current year in the copyright text', () => {
    const copyrightElements = fixture.debugElement.queryAll(By.css('p.text-white-500'));
    const copyrightElement = copyrightElements.find(el => 
      el.nativeElement.textContent.includes('Felix Hollndonner')
    );
    expect(copyrightElement).toBeTruthy();
    expect(copyrightElement?.nativeElement.textContent.trim()).toContain(`© ${currentYear} Felix Hollndonner. All rights reserved.`);
  });

  it('should have social media links with correct attributes', () => {
    const socialLinks = fixture.debugElement.queryAll(By.css('a'));
    
    // Check GitHub link
    const githubLink = socialLinks[0];
    expect(githubLink.attributes['href']).toBe('https://github.com/FelixHolly');
    expect(githubLink.attributes['target']).toBe('_blank');
    expect(githubLink.attributes['rel']).toBe('noopener noreferrer');
    
    // Check LinkedIn link
    const linkedinLink = socialLinks[1];
    expect(linkedinLink.attributes['href']).toBe('https://www.linkedin.com/in/felix-hollndonner');
    expect(linkedinLink.attributes['target']).toBe('_blank');
    expect(linkedinLink.attributes['rel']).toBe('noopener noreferrer');
  });

  it('should display social media icons', () => {
    const socialIcons = fixture.debugElement.queryAll(By.css('img'));
    expect(socialIcons.length).toBe(2);
    
    // Check GitHub icon
    expect(socialIcons[0].attributes['src']).toContain('github.svg');
    expect(socialIcons[0].attributes['alt']).toBe('github');
    
    // Check LinkedIn icon
    expect(socialIcons[1].attributes['src']).toContain('linkedin.svg');
    expect(socialIcons[1].attributes['alt']).toBe('linkedin');
  });

  it('should display terms and privacy links', () => {
    const termsText = fixture.debugElement.query(By.css('.text-white-500')).nativeElement.textContent;
    expect(termsText).toContain('Terms & Conditions');
    expect(termsText).toContain('Privacy Policy');
  });
});
