import { Group, Vector3 } from "three";
import { createPalette } from "./building";
import { DESK, HANG_Z, LETTERBOX } from "./layout";
import { Post } from "./post";

describe("Post", () => {
  const boxFront = HANG_Z + LETTERBOX.depth;
  const slot = new Vector3(LETTERBOX.x, LETTERBOX.y + LETTERBOX.slotRise, boxFront);
  let desk: Group;
  let post: Post;

  /** Plays the flight from `start`, returning where the envelope was at each step. */
  function fly(start: number): Vector3[] {
    const trail: Vector3[] = [];
    for (let now = start; now < start + 10_000; now += 20) {
      const flying = post.update(now);
      trail.push(post.envelope.position.clone());
      if (!flying) return trail;
    }
    throw new Error("the envelope never landed");
  }

  beforeEach(() => {
    desk = new Group();
    desk.position.set(DESK.x, 0, DESK.z);
    desk.rotation.y = 0.25;
    post = new Post(createPalette(), desk);
  });

  it("leaves the envelope lying on the desk until a letter is sent", () => {
    const { position } = post.envelope;

    expect(post.envelope.visible).toBeTrue();
    expect(position.y).toBeGreaterThan(0.75);
    expect(position.y).toBeLessThan(0.9);
    expect(Math.hypot(position.x - DESK.x, position.z - DESK.z)).toBeLessThan(0.75);
    expect(post.update(1000)).toBeFalse();
    expect(post.envelope.visible).toBeTrue();
  });

  it("carries the envelope up to the slot, slides it in and hides it", () => {
    const rest = post.envelope.position.clone();
    post.send(1000, false);
    const trail = fly(1000);
    const last = trail[trail.length - 1];

    expect(trail[0].distanceTo(rest)).toBeLessThan(1e-6);
    expect(trail.some((point) => Math.abs(point.x - slot.x) < 0.01 && Math.abs(point.y - slot.y) < 0.01 && point.z > boxFront)).toBeTrue();
    expect(last.x).toBeCloseTo(slot.x, 3);
    expect(last.y).toBeCloseTo(slot.y, 3);
    expect(last.z).toBeLessThan(boxFront - 0.08);
    expect(post.envelope.visible).toBeFalse();
    expect(post.envelope.rotation.y).toBeCloseTo(0, 6);
    expect(post.update(99_000)).toBeFalse();
  });

  it("takes between one and three seconds", () => {
    post.send(0, false);

    const seconds = (fly(0).length * 20) / 1000;
    expect(seconds).toBeGreaterThan(1);
    expect(seconds).toBeLessThan(3);
  });

  it("never dips under the desk top or passes through the box on the way up", () => {
    const rest = post.envelope.position.clone();
    post.send(0, false);

    for (const point of fly(0)) {
      expect(point.y).toBeGreaterThanOrEqual(rest.y - 1e-6);
      if (point.y < slot.y - 0.01) expect(point.z).toBeGreaterThan(boxFront);
    }
  });

  it("is simply gone for a visitor who asked for less motion", () => {
    post.send(0, true);

    expect(post.envelope.visible).toBeFalse();
    expect(post.update(10)).toBeFalse();
  });

  it("starts again from the desk when another letter is sent", () => {
    const rest = post.envelope.position.clone();
    post.send(0, false);
    fly(0);

    post.send(50_000, false);

    expect(post.envelope.visible).toBeTrue();
    expect(post.envelope.position.distanceTo(rest)).toBeLessThan(1e-6);
    expect(post.update(50_000)).toBeTrue();
  });

  it("restarts cleanly when a second letter goes while the first is still in the air", () => {
    const rest = post.envelope.position.clone();
    post.send(0, false);
    post.update(600);

    post.send(600, false);

    expect(post.envelope.position.distanceTo(rest)).toBeLessThan(1e-6);
    expect(fly(600).length).toBeGreaterThan(40);
    expect(post.envelope.visible).toBeFalse();
  });
});
