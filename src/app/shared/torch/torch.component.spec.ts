import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TorchComponent } from "./torch.component";

describe("TorchComponent", () => {
  let fixture: ComponentFixture<TorchComponent>;
  let glow: HTMLElement;
  let frames: FrameRequestCallback[];

  const move = (x: number, y: number) => document.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y }));
  const runFrame = () => frames.shift()?.(performance.now());

  beforeEach(() => {
    frames = [];
    // Angular's own scheduler also uses animation frames; only the torch's are held back here.
    const realFrame = window.requestAnimationFrame.bind(window);
    spyOn(window, "requestAnimationFrame").and.callFake((callback) =>
      callback.name === "follow" ? frames.push(callback) : realFrame(callback),
    );
    spyOn(window, "cancelAnimationFrame");
    fixture = TestBed.createComponent(TorchComponent);
    fixture.detectChanges();
    glow = fixture.nativeElement.querySelector(".torch");
  });

  afterEach(() => fixture.destroy());

  it("asks for no frames while the mouse is still", () => {
    expect(frames.length).toBe(0);
    expect(glow.style.opacity).toBe("");
  });

  it("lights up at the cursor on the first movement", () => {
    move(200, 120);
    runFrame();

    expect(glow.style.opacity).toBe("1");
    expect(glow.style.transform).toContain("translate3d(200px, 120px, 0px)");
  });

  it("trails the cursor, then stops asking for frames once it has caught up", () => {
    move(0, 0);
    runFrame();
    move(400, 0);

    let steps = 0;
    while (frames.length && steps < 500) {
      runFrame();
      steps++;
    }

    expect(steps).toBeGreaterThan(5);
    expect(steps).toBeLessThan(500);
    expect(frames.length).toBe(0);
    expect(glow.style.transform).toMatch(/translate3d\(399\.\d+px|translate3d\(400px/);
  });

  it("never queues more than one frame however fast the mouse moves", () => {
    move(10, 10);
    move(20, 20);
    move(30, 30);

    expect(frames.length).toBe(1);
  });

  it("starts again when the mouse moves after resting", () => {
    move(0, 0);
    while (frames.length) runFrame();

    move(50, 50);

    expect(frames.length).toBe(1);
  });
});
