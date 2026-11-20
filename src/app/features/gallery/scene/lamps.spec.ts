import { Box3, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, PlaneGeometry, ShaderMaterial, SpotLight, Texture, Vector3 } from "three";
import { createPalette, Palette } from "./building";
import { buildPoses, buildWaypoints, CameraPath, Pose } from "./camera-path";
import { framedPicture, letteredBoard, pictureLight } from "./exhibits";
import { FIRST_WORK_STOP } from "./film";
import { writingDesk } from "./furniture";
import { OPEN_BAND, SceneWork } from "./gallery-view";
import { LAMP_OFF_LEVEL, LAMP_REACH, LAMP_SET_OFF, LAMP_TIMING, LampCascade, lampPlan, LampRoom, LampRoomPlan, Lamps } from "./lamps";
import { DESK, DOOR_XS, END_WALL_X, HANG_Z, LECTERN, pieceSlots, PORTRAIT, portraitSlot, ROTUNDA, SKILL_PLAQUES } from "./layout";
import { GalleryLights } from "./lights";

const WORKS: SceneWork[] = [
  { slug: "commission", kind: "commission", images: ["a", "b", "c"].map((src) => ({ src, portrait: false })) },
  { slug: "study", kind: "study", images: [{ src: "d", portrait: true }] },
  { slug: "other", kind: "study", images: [{ src: "e", portrait: true }] },
  { slug: "self", kind: "self-portrait", images: [{ src: "f", portrait: false }] },
];
const SLOTS = pieceSlots(WORKS);
const BOARD = { x: LECTERN.x, y: 2.08, width: 2.3, height: 0.96 };
const VISITORS_BOOK = FIRST_WORK_STOP + WORKS.length;
const { ramp, stagger } = LAMP_TIMING;
const FRAME = 1 / 60;

/** Four rooms in a row, shaped like the gallery's: two lamps, five, one and two. */
const ROOMS: LampRoom[] = [
  { door: 5, first: 1, last: 2, lamps: 2 },
  { door: 18, first: 3, last: 7, lamps: 5 },
  { door: 48, first: 8, last: 8, lamps: 1 },
  { door: 56, first: 9, last: 9, lamps: 2 },
];
const ENTRANCE = { progress: 0, x: -7 };
/** Just inside each room's reach, on the stride into it. */
const INTO = ROOMS.map((room) => ({ progress: room.first - 0.5, x: room.door - LAMP_REACH + 0.01 }));
/** Standing at each room's first stop. */
const INSIDE = ROOMS.map((room) => ({ progress: room.first, x: room.door + 3 }));

function levels(cascade: LampCascade, room: number): number[] {
  return Array.from({ length: ROOMS[room].lamps }, (_, lamp) => cascade.level(room, lamp));
}

function everyLevel(cascade: LampCascade): number[] {
  return ROOMS.flatMap((_, room) => levels(cascade, room));
}

describe("LampCascade", () => {
  let cascade: LampCascade;
  /** Stands at `at` for `seconds`, bound for where the camera already is unless told otherwise. */
  const stand = (seconds: number, at: { progress: number; x: number }, heading = at.progress) => cascade.update(seconds, at, heading);

  beforeEach(() => {
    cascade = new LampCascade(ROOMS);
  });

  it("leaves every room dark, and the scene at rest, while the visitor stands in the hall", () => {
    expect(stand(1, ENTRANCE)).toBeFalse();
    expect(everyLevel(cascade)).toEqual(new Array(10).fill(0));
    expect(cascade.lit).toBe(0);
  });

  it("sets a room's lamps off once the visitor walking into it is within reach of its doorway", () => {
    const short = { progress: 0.6, x: ROOMS[0].door - LAMP_REACH - 0.01 };

    expect(stand(1, short)).toBeFalse();
    expect(levels(cascade, 0)).toEqual([0, 0]);

    expect(stand(FRAME, INTO[0])).toBeTrue();
    stand(ramp / 2, INTO[0]);
    expect(cascade.level(0, 0)).toBeCloseTo(0.5, 5);
    expect(levels(cascade, 1)).toEqual([0, 0, 0, 0, 0]);
  });

  it("waits for the walk into the room: standing at the last stop before a doorway, however near it, lights nothing", () => {
    const beside = { progress: ROOMS[2].first - 1, x: ROOMS[2].door - 0.5 };
    cascade.arrive(beside);

    expect(stand(1, beside)).toBeFalse();
    expect(levels(cascade, 2)).toEqual([0]);

    expect(stand(FRAME, { ...beside, progress: beside.progress + LAMP_SET_OFF - 0.01 })).toBeFalse();
    expect(stand(FRAME, { ...beside, progress: beside.progress + LAMP_SET_OFF })).toBeTrue();
  });

  it("brings the lamps on one after another, the one nearest the doorway first", () => {
    stand(0, INTO[1]);
    stand(stagger * 2 + ramp / 2, INTO[1]);
    const [first, second, third, fourth, fifth] = levels(cascade, 1);

    expect(first).toBe(1);
    expect(second).toBeGreaterThan(third);
    expect(third).toBeCloseTo(0.5, 5);
    expect(fourth).toBe(0);
    expect(fifth).toBe(0);
  });

  it("starts each lamp a fixed beat after the one before and brings it up over the same time", () => {
    for (let lamp = 0; lamp < 5; lamp++) {
      const fresh = new LampCascade(ROOMS);
      fresh.update(0, INTO[1], INTO[1].progress);
      fresh.update(lamp * stagger, INTO[1], INTO[1].progress);
      expect(fresh.level(1, lamp)).withContext(`lamp ${lamp} at its start`).toBe(0);
      fresh.update(ramp, INTO[1], INTO[1].progress);
      expect(fresh.level(1, lamp)).withContext(`lamp ${lamp} a ramp later`).toBeCloseTo(1, 6);
    }
  });

  it("only ever brightens, in steps too small to see: no flicker and no flash", () => {
    stand(0, INTO[1]);
    let before = levels(cascade, 1);
    let largest = 0;
    for (let frame = 0; frame < 120; frame++) {
      stand(FRAME, INTO[1]);
      const now = levels(cascade, 1);
      now.forEach((level, lamp) => {
        expect(level).toBeGreaterThanOrEqual(before[lamp]);
        largest = Math.max(largest, level - before[lamp]);
      });
      before = now;
    }

    expect(before).toEqual([1, 1, 1, 1, 1]);
    expect(largest).toBeLessThan(0.08);
  });

  it("has the longest room fully lit in under a second and a half", () => {
    const longest = Math.max(...ROOMS.map((room) => (room.lamps - 1) * stagger + ramp));

    expect(longest).toBeLessThan(1.5);
    stand(0, INTO[1]);
    stand(1.49, INTO[1]);
    expect(levels(cascade, 1)).toEqual([1, 1, 1, 1, 1]);
  });

  it("keeps the scene drawing while a lamp is coming on, and lets it rest once the last one is on", () => {
    const whole = stagger + ramp;

    expect(stand(0, INTO[0])).toBeTrue();
    expect(stand(whole - 0.01, INTO[0])).toBeTrue();
    expect(stand(0.02, INTO[0])).toBeFalse();
    expect(stand(FRAME, INSIDE[0])).toBeFalse();
    expect(levels(cascade, 0)).toEqual([1, 1]);
  });

  it("lights a room once: walking out and in again changes nothing", () => {
    stand(0, INTO[0]);
    stand(2, INSIDE[0]);
    stand(1, ENTRANCE);
    expect(levels(cascade, 0)).toEqual([1, 1]);

    expect(stand(FRAME, INTO[0])).toBeFalse();
    expect(levels(cascade, 0)).toEqual([1, 1]);
    expect(cascade.lit).toBe(1);
  });

  it("goes on coming on when the visitor turns round in the doorway", () => {
    stand(0, INTO[1]);
    stand(0.1, INTO[1]);
    const turned = cascade.level(1, 0);

    expect(stand(0.1, INSIDE[0], INSIDE[0].progress)).toBeTrue();
    expect(cascade.level(1, 0)).toBeGreaterThan(turned);
    stand(2, INSIDE[0]);
    expect(levels(cascade, 1)).toEqual([1, 1, 1, 1, 1]);
  });

  it("stays dark when the visitor turns round short of the doorway, and stages the room the next time", () => {
    const short = { progress: 2.2, x: ROOMS[1].door - LAMP_REACH - 1 };
    stand(0.5, short);
    stand(1, INSIDE[0]);
    expect(levels(cascade, 1)).toEqual([0, 0, 0, 0, 0]);

    expect(stand(0, INTO[1])).toBeTrue();
    stand(ramp / 2, INTO[1]);
    expect(cascade.level(1, 0)).toBeCloseTo(0.5, 5);
  });

  it("lights the rooms a walk only passes at once, before the camera is near them, and stages the one it ends in", () => {
    const bound = ROOMS[3].first;

    expect(stand(FRAME, ENTRANCE, bound)).toBeFalse();
    expect([0, 1, 2].flatMap((room) => levels(cascade, room))).toEqual(new Array(8).fill(1));
    expect(levels(cascade, 3)).toEqual([0, 0]);

    expect(stand(FRAME, INTO[3], bound)).toBeTrue();
    stand(ramp / 2, INTO[3], bound);
    expect(cascade.level(3, 0)).toBeGreaterThan(0.4);
    expect(cascade.level(3, 0)).toBeLessThan(1);
  });

  it("stages a room the visitor is bound for any stop of, not only its first", () => {
    stand(FRAME, ENTRANCE, 6);
    expect(levels(cascade, 0)).toEqual([1, 1]);
    expect(levels(cascade, 1)).toEqual([0, 0, 0, 0, 0]);

    expect(stand(0, INTO[1], 6)).toBeTrue();
  });

  it("lets a show that has begun run on when the walk turns out to go further", () => {
    stand(0, INTO[2]);
    stand(0.1, INTO[2], 9);

    expect(cascade.level(2, 0)).toBeGreaterThan(0);
    expect(cascade.level(2, 0)).toBeLessThan(1);
  });

  it("leaves the rooms ahead dark when the visitor walks back", () => {
    cascade.arrive(INSIDE[1]);

    expect(stand(1, INSIDE[0], 0)).toBeFalse();
    expect(stand(1, ENTRANCE, 0)).toBeFalse();
    expect(levels(cascade, 2)).toEqual([0]);
    expect(levels(cascade, 3)).toEqual([0, 0]);
  });

  it("veils only as many plaques as hang", () => {
    expect(lampPlan(SLOTS, BOARD, 2)[0].sites[1].pictures.length).toBe(2);
  });

  it("lights the room a visitor is set down in, and every room before it, without a show", () => {
    cascade.arrive(INSIDE[1]);

    expect(levels(cascade, 0)).toEqual([1, 1]);
    expect(levels(cascade, 1)).toEqual([1, 1, 1, 1, 1]);
    expect(levels(cascade, 2)).toEqual([0]);
    expect(cascade.lit).toBe(2);
    expect(stand(FRAME, INSIDE[1])).toBeFalse();
  });

  it("leaves the next room dark for a visitor set down at the last stop before its doorway, and stages it when they walk on", () => {
    cascade.arrive({ progress: 7, x: ROOMS[2].door - 0.5 });
    expect(levels(cascade, 2)).toEqual([0]);

    expect(stand(0, { progress: 7.2, x: ROOMS[2].door - 0.4 })).toBeTrue();
  });

  it("leaves no room dark behind a camera that leaps several doorways in one slow frame", () => {
    expect(stand(0.25, INSIDE[2], INSIDE[2].progress)).toBeTrue();

    expect(levels(cascade, 0)).toEqual([1, 1]);
    expect(levels(cascade, 1)).toEqual([1, 1, 1, 1, 1]);
    expect(cascade.level(2, 0)).toBe(0);
    expect(cascade.lit).toBe(3);
  });

  it("has every lamp on from the start for a visitor who asked for less motion, and draws nothing for it", () => {
    const still = new LampCascade(ROOMS, Infinity);

    expect(everyLevel(still)).toEqual(new Array(10).fill(1));
    expect(still.update(1, ENTRANCE, 0)).toBeFalse();
    expect(still.update(1, INTO[1], 3)).toBeFalse();
    expect(still.lit).toBe(4);
  });

  it("finds the rooms an earlier scene lit still lit, and stages the next", () => {
    const reopened = new LampCascade(ROOMS, 2);

    expect(levels(reopened, 1)).toEqual([1, 1, 1, 1, 1]);
    expect(levels(reopened, 2)).toEqual([0]);
    expect(reopened.update(0, INTO[2], 8)).toBeTrue();
  });
});

describe("lampPlan", () => {
  const plan = lampPlan(SLOTS, BOARD);
  const [developer, works, visitorsBook, correspondence] = plan;

  it("gives each of the four rooms its doorway and its stops, in walking order", () => {
    expect(plan.map((room) => room.door)).toEqual([...DOOR_XS]);
    expect(plan.map((room) => [room.first, room.last])).toEqual([
      [1, 2],
      [3, VISITORS_BOOK - 1],
      [VISITORS_BOOK, VISITORS_BOOK],
      [VISITORS_BOOK + 1, VISITORS_BOOK + 1],
    ]);
  });

  it("leaves the hall out: the lion is always lit", () => {
    expect(Math.min(...plan.map((room) => room.door))).toBeGreaterThan(ROTUNDA.x + ROTUNDA.radius - 1);
  });

  it("orders every room's lamps from its doorway on, each inside the room", () => {
    plan.forEach((room, index) => {
      const xs = room.sites.map((site) => site.x);
      const end = plan[index + 1]?.door ?? END_WALL_X;

      expect(xs).toEqual([...xs].sort((a, b) => a - b));
      expect(xs[0]).toBeGreaterThan(room.door);
      expect(xs[xs.length - 1]).toBeLessThan(end);
    });
  });

  it("hangs one lamp over the portrait and one over the block of skill plaques", () => {
    expect(developer.sites.map((site) => site.x)).toEqual([PORTRAIT.x, SKILL_PLAQUES.x]);
    expect(developer.sites[0].pictures).toEqual([PORTRAIT]);
    expect(developer.sites[1].pictures.length).toBe(SKILL_PLAQUES.count);
  });

  it("hangs one lamp over each column of frames, so a commission's stacked companions share theirs", () => {
    const [main, upper, lower] = SLOTS[0].frames;

    expect(works.sites.length).toBe(5);
    expect(works.sites[0].pictures).toEqual([main]);
    expect(works.sites[1].pictures).toEqual([upper, lower]);
    expect(works.sites.slice(2).map((site) => site.pictures)).toEqual(SLOTS.slice(1).map((slot) => slot.frames));
  });

  it("lights the board of names from the lectern's lamp, and has a lamp there without the board", () => {
    expect(visitorsBook.sites.map((site) => site.pictures)).toEqual([[BOARD]]);
    expect(lampPlan(SLOTS)[2].sites.map((site) => site.pictures)).toEqual([[]]);
  });

  it("gives the desk its reading lamp and the light over it, the reading lamp first", () => {
    expect(correspondence.sites.length).toBe(2);
    expect(correspondence.sites[0].x).toBeLessThan(DESK.x);
    expect(correspondence.sites[1].x).toBe(DESK.x);
    expect(correspondence.sites.flatMap((site) => site.pictures)).toEqual([]);
  });

  it("has no room's show last longer than a second and a half", () => {
    for (const room of plan) expect((room.sites.length - 1) * stagger + ramp).toBeLessThan(1.5);
  });
});

describe("the lamps on the real route", () => {
  const plan = lampPlan(SLOTS, BOARD);
  const rooms = plan.map(({ door, first, last, sites }) => ({ door, first, last, lamps: sites.length }));
  const framings = [
    { aspect: 1288 / 654, labelShare: 0.38, statueBand: OPEN_BAND },
    { aspect: 1920 / 969, labelShare: 0.3, statueBand: OPEN_BAND },
    { aspect: 390 / 844, labelShare: 0, statueBand: OPEN_BAND },
  ];

  function route(framing: (typeof framings)[number]): (progress: number) => { progress: number; x: number } {
    const path = new CameraPath(buildPoses(SLOTS, framing), buildWaypoints(SLOTS.length));
    const pose: Pose = { position: new Vector3(), target: new Vector3() };
    return (progress) => {
      path.sample(progress, pose);
      return { progress, x: pose.position.x };
    };
  }

  it("stay dark at every stop before a room, on a wide screen and on a phone", () => {
    for (const framing of framings) {
      const at = route(framing);
      rooms.forEach((room, index) => {
        const cascade = new LampCascade(rooms);
        cascade.arrive(at(room.first - 1));

        expect(cascade.lit).withContext(`room ${index + 1} at aspect ${framing.aspect.toFixed(2)}`).toBe(index);
      });
    }
  });

  it("come on before the visitor is through the doorway, on the stride into the room", () => {
    for (const framing of framings) {
      const at = route(framing);
      rooms.forEach((room, index) => {
        const cascade = new LampCascade(rooms, index);
        let progress = room.first - 1;
        while (cascade.lit === index && progress < room.first) {
          progress += 0.005;
          cascade.update(0, at(progress), room.first);
        }

        expect(progress).withContext(`room ${index + 1}`).toBeLessThan(room.first - 0.1);
        expect(progress).withContext(`room ${index + 1}`).toBeGreaterThanOrEqual(room.first - 1 + LAMP_SET_OFF);
        expect(at(progress).x).withContext(`room ${index + 1}`).toBeLessThan(room.door);
      });
    }
  });

  it("are all on after a scroll through every room at any pace, and none ever dims on the way", () => {
    const at = route(framings[0]);
    const last = rooms[rooms.length - 1].last;

    for (const pace of [0.5, 3, 12, 60]) {
      const cascade = new LampCascade(rooms);
      const all = () => rooms.flatMap((room, index) => Array.from({ length: room.lamps }, (_, lamp) => cascade.level(index, lamp)));
      let target = 0;
      let progress = 0;
      let before = all();
      for (let frame = 0; frame < 60 * 25; frame++) {
        target = Math.min(target + pace * FRAME, last);
        // The camera's own glide towards where the page has scrolled to
        progress += (target - progress) * (1 - Math.exp(-FRAME * 4.5));
        cascade.update(FRAME, at(progress), target);
        const now = all();
        expect(now.every((level, lamp) => level >= before[lamp])).withContext(`${pace} stops a second`).toBeTrue();
        before = now;
      }

      expect(before).withContext(`${pace} stops a second`).toEqual(new Array(before.length).fill(1));
    }
  });
});

describe("Lamps", () => {
  let palette: Palette;
  let lights: GalleryLights;
  let scene: Group;
  let lamps: Lamps;
  let plan: LampRoomPlan[];
  let fittings: Group[];
  let desk: Group;
  const plain = new MeshLambertMaterial();

  const spots = () => lights.objects.filter((object): object is SpotLight => object instanceof SpotLight);
  /** The spotlights aimed into a room, by where along the building they point. */
  const aimedInto = (room: number) =>
    spots().filter((spot) => spot.target.position.x >= plan[room].door && spot.target.position.x < (plan[room + 1]?.door ?? END_WALL_X));
  const veils = () => lamps.objects as Mesh<PlaneGeometry, MeshBasicMaterial>[];
  const wash = (fitting: Object3D) => (fitting.getObjectByName("wash") as Mesh<PlaneGeometry, ShaderMaterial>).material.uniforms["strength"];
  const glass = (fitting: Object3D) => {
    const found: MeshBasicMaterial[] = [];
    fitting.traverse((part) => {
      const material = (part as Mesh).material;
      if (material instanceof MeshBasicMaterial) found.push(material);
    });
    return found;
  };
  const readingLamp = () => desk.getObjectByName("lamp") as Group;
  const pool = () => {
    let found: ShaderMaterial | undefined;
    readingLamp().traverse((part) => {
      const material = (part as Mesh).material;
      if (material instanceof ShaderMaterial) found = material;
    });
    return (found as ShaderMaterial).uniforms["strength"];
  };

  /** One frame of the scene: the lights set their own strengths, then the lamps scale them. */
  function frame(seconds: number, at: { progress: number; x: number }, heading = at.progress): boolean {
    lights.update(at.progress, 1);
    return lamps.update(seconds, at, heading);
  }

  function build(lit = 0): void {
    plan = lampPlan(SLOTS, BOARD);
    lights = new GalleryLights(SLOTS);
    scene = new Group();
    scene.add(...lights.objects);

    fittings = [portraitSlot("portrait"), ...SLOTS[0].frames.slice(0, 2)].map((slot) => {
      const { group } = framedPicture(slot, palette, plain);
      const fitting = pictureLight(slot, palette);
      group.add(fitting);
      scene.add(group);
      return fitting;
    });
    desk = writingDesk(palette, { x: DESK.x + 1.2, z: 0.4 });
    scene.add(desk);

    lamps = new Lamps(plan, lit);
    scene.add(...lamps.objects);
    lamps.adopt(scene);
  }

  const hall = { progress: 0, x: ROTUNDA.x - 5 };
  const into = (room: number) => ({ progress: plan[room].first - 0.5, x: plan[room].door - LAMP_REACH + 0.01 });

  beforeEach(() => {
    palette = createPalette();
    build();
  });

  it("puts out every room's spotlights and leaves the hall's alone", () => {
    frame(0, hall);
    const [key, rim] = spots();

    expect(key.intensity).toBeGreaterThan(0);
    expect(rim.intensity).toBeGreaterThan(0);
    expect(spots().length).toBe(2 + 2 + SLOTS.length + 2);
    for (const room of [0, 1, 2, 3]) {
      expect(aimedInto(room).length).withContext(`room ${room + 1}`).toBeGreaterThan(0);
      for (const spot of aimedInto(room)) expect(spot.intensity).withContext(`room ${room + 1}`).toBe(0);
    }
  });

  it("gives each spotlight back exactly what the lights set once its lamp is on", () => {
    frame(0, into(0));
    frame(2, into(0));
    const lit = aimedInto(0).map((spot) => spot.intensity);
    const nextRoom = aimedInto(1).map((spot) => spot.intensity);
    lights.update(into(0).progress, 1);

    expect(lit.every((intensity) => intensity > 0)).toBeTrue();
    expect(lit).toEqual(aimedInto(0).map((spot) => spot.intensity));
    expect(nextRoom).toEqual(new Array(SLOTS.length).fill(0));
  });

  it("scales what the lights gave a spotlight that frame by its lamp's level, the same on every frame", () => {
    frame(0, into(0));
    frame(ramp / 2, into(0));
    const [portrait] = aimedInto(0);
    const half = portrait.intensity;
    frame(0, into(0));

    expect(portrait.intensity).toBe(half);
    lights.update(into(0).progress, 1);
    expect(half).toBeCloseTo(portrait.intensity / 2, 6);
  });

  it("joins each spotlight to the lamp nearest where it points: a commission's to the lamp over its main picture", () => {
    frame(0, into(1));
    frame(ramp, into(1));
    const [commission, study] = aimedInto(1);

    expect(commission.intensity).toBeGreaterThan(0);
    expect(study.intensity).toBe(0);
  });

  it("shows an unlit fitting dull and throwing nothing, and a lit one exactly as it was built", () => {
    const built = pictureLight(portraitSlot("portrait"), palette);
    const [portrait, main] = fittings;

    expect(wash(portrait).value).toBe(0);
    glass(portrait).forEach((material, part) => {
      expect(material.color.r).toBeLessThan(glass(built)[part].color.r * 0.2);
      expect(material.color.r).toBeGreaterThan(0);
    });

    frame(0, into(0));
    frame(2, into(0));
    expect(wash(portrait).value).toBe(wash(built).value);
    glass(portrait).forEach((material, part) => expect(material.color.equals(glass(built)[part].color)).toBeTrue());
    expect(wash(main).value).toBe(0);
  });

  it("brings a fitting's glow up with its lamp, a little at a time", () => {
    const [portrait] = fittings;
    const full = wash(pictureLight(portraitSlot("portrait"), palette)).value as number;
    frame(0, into(0));
    frame(ramp / 2, into(0));

    expect(wash(portrait).value).toBeCloseTo(full / 2, 6);
  });

  it("turns the reading lamp on before the light over the desk, and leaves the desk's painted shadow as it is", () => {
    const shadows = () => {
      const found: number[] = [];
      desk.traverse((part) => {
        const material = (part as Mesh).material;
        if (material instanceof ShaderMaterial && !readingLamp().getObjectById(part.id)) found.push(material.uniforms["strength"].value as number);
      });
      return found;
    };
    const before = shadows();
    const [over] = aimedInto(3);

    expect(pool().value).toBe(0);
    frame(0, into(3));
    frame(stagger, into(3));

    expect(pool().value).toBeGreaterThan(0);
    expect(over.intensity).toBe(0);
    frame(ramp, into(3));
    expect(over.intensity).toBeGreaterThan(0);
    expect(shadows()).toEqual(before);
    expect(before.length).toBe(1);
  });

  it("lays a veil over every picture, plaque and the board of names, and none in Room IV", () => {
    const pictures = plan.flatMap((room) => room.sites.flatMap((site) => site.pictures));

    expect(veils().length).toBe(1 + SKILL_PLAQUES.count + SLOTS.flatMap((slot) => slot.frames).length + 1);
    veils().forEach((veil, index) => {
      expect(veil.position.x).toBe(pictures[index].x);
      expect(veil.position.y).toBe(pictures[index].y);
      expect(veil.geometry.parameters.width).toBe(pictures[index].width);
      expect(veil.geometry.parameters.height).toBe(pictures[index].height);
    });
  });

  it("hangs a picture's veil just in front of the picture and behind the face of its moulding", () => {
    const [veil] = veils();
    const { group, picture } = framedPicture(portraitSlot("portrait"), palette, plain);
    group.updateMatrixWorld(true);
    const front = new Box3().setFromObject(group, true).max.z;

    expect(veil.position.z).toBeGreaterThan(picture.getWorldPosition(new Vector3()).z + 0.002);
    expect(veil.position.z).toBeLessThan(front);
  });

  it("hangs a board's veil just in front of its lettering and behind the face of its frame", () => {
    const veil = veils()[veils().length - 1];
    const board = letteredBoard(BOARD.x, BOARD.y, BOARD.width, BOARD.height, new Texture(), palette);
    board.updateMatrixWorld(true);
    const front = new Box3().setFromObject(board, true).max.z;

    expect(veil.position.z).toBeGreaterThan(board.children[0].getWorldPosition(new Vector3()).z + 0.002);
    expect(veil.position.z).toBeLessThan(front);
    expect(veil.position.z).toBeGreaterThan(HANG_Z);
  });

  it("leaves a picture under an unlit lamp dimmed, not black, and draws no veil at all once the lamp is on", () => {
    const [portrait, firstPlaque] = veils();

    expect(portrait.visible).toBeTrue();
    expect(portrait.material.opacity).toBeCloseTo(1 - LAMP_OFF_LEVEL, 6);
    expect(portrait.material.opacity).toBeLessThan(0.9);
    expect(portrait.material.color.getHex()).toBe(0x000000);
    expect(portrait.material.transparent).toBeTrue();
    expect(portrait.material.depthWrite).toBeFalse();

    frame(0, into(0));
    frame(ramp, into(0));
    expect(portrait.visible).toBeFalse();
    expect(firstPlaque.visible).toBeTrue();
    expect(firstPlaque.material.opacity).toBeLessThan(1 - LAMP_OFF_LEVEL);

    frame(stagger + 0.01, into(0));
    expect(firstPlaque.visible).toBeFalse();
  });

  it("lights the rooms up to a visitor set down in one at once, and keeps the rest dark", () => {
    lamps.arrive({ progress: FIRST_WORK_STOP, x: SLOTS[0].centre.x });
    expect(frame(0, { progress: FIRST_WORK_STOP, x: SLOTS[0].centre.x })).toBeFalse();

    for (const spot of [...aimedInto(0), ...aimedInto(1)]) expect(spot.intensity).toBeGreaterThan(0);
    for (const spot of [...aimedInto(2), ...aimedInto(3)]) expect(spot.intensity).toBe(0);
    expect(fittings.map((fitting) => wash(fitting).value as number).every((strength) => strength > 0)).toBeTrue();
    expect(veils().filter((veil) => veil.visible).length).toBe(1);
    expect(lamps.lit).toBe(2);
  });

  it("is simply lit for a visitor who asked for less motion: nothing veiled, nothing dimmed, nothing to draw", () => {
    build(Infinity);

    expect(frame(1, hall)).toBeFalse();
    expect(veils().some((veil) => veil.visible)).toBeFalse();
    expect(pool().value).toBeGreaterThan(0);
    for (const room of [0, 1, 2, 3]) for (const spot of aimedInto(room)) expect(spot.intensity).toBeGreaterThan(0);
    expect(lamps.lit).toBe(4);
  });
});
