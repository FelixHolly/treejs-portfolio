import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RevealDirective } from "./reveal.directive";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RevealDirective],
  template: `
    @if (shown()) {
      <p id="plain" appReveal>plain</p>
      <p id="late" appReveal [revealDelay]="120">late</p>
    }
  `,
})
class HostComponent {
  readonly shown = signal(true);
}

describe("RevealDirective", () => {
  let fixture: ComponentFixture<HostComponent>;
  let observers: { callback: IntersectionObserverCallback; observe: jasmine.Spy; disconnect: jasmine.Spy }[];
  const original = window.IntersectionObserver;

  const node = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  const intersect = (index: number, isIntersecting: boolean) =>
    observers[index].callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);

  beforeEach(() => {
    observers = [];
    window.IntersectionObserver = class {
      readonly observe = jasmine.createSpy("observe");
      readonly disconnect = jasmine.createSpy("disconnect");
      constructor(readonly callback: IntersectionObserverCallback) {
        observers.push(this);
      }
    } as unknown as typeof IntersectionObserver;

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => (window.IntersectionObserver = original));

  it("rests each element in shadow and watches it", () => {
    expect(node("plain").classList).toContain("reveal-init");
    expect(node("plain").classList).not.toContain("reveal-in");
    expect(observers[0].observe).toHaveBeenCalledOnceWith(node("plain"));
  });

  it("delays only the element that asks for it", () => {
    expect(node("plain").style.transitionDelay).toBe("");
    expect(node("late").style.transitionDelay).toBe("120ms");
  });

  it("stays in shadow while out of view", () => {
    intersect(0, false);

    expect(node("plain").classList).not.toContain("reveal-in");
    expect(observers[0].disconnect).not.toHaveBeenCalled();
  });

  it("reveals once in view and stops watching, leaving its neighbour alone", () => {
    intersect(0, true);

    expect(node("plain").classList).toContain("reveal-in");
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    expect(node("late").classList).not.toContain("reveal-in");
  });

  it("stops watching when the element leaves the page", () => {
    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();

    expect(observers[1].disconnect).toHaveBeenCalledTimes(1);
  });
});
