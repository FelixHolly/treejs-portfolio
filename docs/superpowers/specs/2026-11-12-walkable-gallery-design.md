# Walkable Gallery: design

Date: 2026-11-12
Status: draft, awaiting Felix's approval (revised 2026-11-13 with his answers)

## Intent

Turn the portfolio from a scrolling page with a museum skin into a small museum you actually move through. The visitor glides along a fixed route through an enfilade of rooms, stops in front of each piece, and reads a proper wall label. The Stone & Gold look, the Viennese lion, and the room names stay.

Why: a UI/UX audit on 2026-11-12 found the visual skin distinctive but the page skeleton and copy still those of a widely cloned tutorial template (hero, about, carousel, testimonials, contact form). Felix chose the walkable gallery over deepening the flat page or restyling to minimalism.

## Goals

1. A guided 3D walk through five spaces: Rotunda (entrance, the lion), Room I The Developer, Room II The Works, Room III Visitors' Book, Room IV Correspondence.
2. The name and role are readable as text immediately, never gated behind a model download.
3. Nobody can miss or fail to reach the work: every stop is reachable by scroll, keyboard, touch, and the floor plan.
4. Each work gets a real wall label: what the problem was, what Felix built, year, materials (stack), status, links. Küchenschelle, the one finished commission, is shown in depth.
5. A flat "catalogue" view carries the same content for phones, slow connections, reduced motion, assistive technology, and visitors in a hurry.
6. Template leftovers are gone: filler stats, generic bio, tutorial contact copy, Terms & Conditions page link, the decorative globe.

## Non-goals

- Free walking (WASD, pointer lock, collision).
- Sound.
- A signable Visitors' Book (needs a backend; the site is static on GitHub Pages). The book is built with the two existing quotes; signing is a later project.
- Per-project routes or a blog.
- New 3D model files. Everything except the lion is procedural geometry.
- Migrating the existing `sections/` code into `features/` beyond what this work touches.

## Anti-goals (failure even if it works)

- Scroll-jacking: the wheel must never be captured or have its speed overridden. Native scrolling drives the camera.
- Any state where the visitor is lost, stuck, or facing a blank wall.
- Content that exists only inside the canvas.
- A loading curtain that hides the name. Measured on the live site today: 3.1 s on broadband, 16.5 s on slow 4G before the name appears. That must become well under 1 s on broadband regardless of 3D.
- Looking like the free-roam virtual gallery templates (white cube, WASD, pointer lock).

## Approaches considered

1. **Free walking** (WASD and mouse look). Most game-like. Rejected: unfamiliar controls for most visitors, poor on trackpads and phones, visitors get lost, and it is the established template trope.
2. **Guided path** (chosen by Felix). Camera travels a fixed spline between stops, driven by native scroll, keys, and the floor plan. Nobody misses the work, the stops map one to one onto the flat catalogue, and it is far less to build and test.
3. **Click-to-teleport between fixed viewpoints** with no travel. Cheapest. Rejected: loses the sense of walking through a building, which is the whole point of choosing 3D.

## The visit

1. **Arrival.** Name and "Full-Stack Developer" render at once as HTML over a dark hall. When the lion model is ready the lights come up on it (the existing 2.2 s light ramp is reused). Two plaques below the name: "Enter the gallery" and "Read the catalogue".
2. **Moving.** Scrolling advances the camera along the route. Arrow keys, Page Up/Down, and Space step to the previous or next stop. Mouse movement adds a small look-around offset (a few degrees, eased), as the hero lion does today.
3. **Floor plan.** A small plan of the enfilade replaces the nav bar links in gallery view. It marks the current room and each room is a button that travels there.
4. **Room I, The Developer.** Wall text about Felix, the FH medallion as a wall relief, the tech frieze around the cornice.
5. **Room II, The Works.** One wall, three works, all visible on entry. Küchenschelle is the Commission: a large central frame flanked by two smaller frames showing other views of the same product (a recipe page and the admin dashboard), so the finished piece carries the room. WheelWallet and ReLoo hang further along as Studies in smaller, plainer frames. GreenWave is removed from the collection.
6. **Stopping at a piece.** The camera steps up to the frame, the spotlight tightens, and the wall label appears as HTML beside it. "Closer look" opens full-size screenshots in a lightbox.
7. **Room III, Visitors' Book.** An open book on a lectern; the two reference quotes are its pages.
8. **Room IV, Correspondence.** A writing desk with the letter on it. The stop shows the existing bone-paper contact form, plus a CV download and LinkedIn and GitHub links.
9. **Exit.** A final plaque with a button back to the Rotunda.

### Stops

| # | Id | Room | Label content |
|---|----|------|---------------|
| 0 | `entrance` | Rotunda | Name, role, the two plaques |
| 1 | `developer` | I | Bio wall text, medallion, frieze |
| 2 | `works` | II | Room label, overview of the wall |
| 3..n | `works/<slug>` | II | One per work, in `ProjectService` order: `kuechenschelle`, `wheelwallet`, `reloo` |
| n+1 | `visitors-book` | III | The two quotes |
| n+2 | `correspondence` | IV | Contact form, CV download, LinkedIn and GitHub |

## Decisions Felix made

- Walkable gallery over the other two directions.
- Guided path, not free walking.
- Stone & Gold palette, lion, type, and room names carry over.
- Küchenschelle stays first in Room II.
- No sound and no signable book in this project.
- Audience: employers first (hiring managers and tech leads). Copy stresses role, stack, and outcomes; the CV is easy to find.
- Room II labels: Küchenschelle is the "Commission"; WheelWallet and ReLoo are "Studies". Neither study has a working application yet, so they carry no live link. GreenWave is abandoned and removed from the site.
- Location stays "Based in the United States". One line explains the Vienna connection so the lion and the Austrian references make sense.
- Room IV offers the contact form, a CV download, and LinkedIn and GitHub links. No visible email address.
- Code links appear only for public repos. As of 2026-11-13 the Küchenschelle, WheelWallet, and ReLoo repos are not publicly readable, so no code links ship unless Felix makes one public.
- Angular: phase 1 ships on Angular 19; the upgrade to 21 and zoneless happens between phase 1 and phase 2.

## Design calls (mine, open to correction)

### Two views of one content source

- One route (`/`) with two views: `gallery` and `catalogue`. Both render from the same typed content (projects, bio, quotes, contact), so they cannot drift.
- Default view: `gallery` only when all hold: viewport width at least 1024px, fine pointer, WebGL available, no `prefers-reduced-motion`, no `navigator.connection.saveData`. Otherwise `catalogue`.
- The visitor's explicit choice wins and is remembered in `localStorage`. A switch between views is always visible. `?view=catalogue` and `?view=gallery` force a view for sharing.
- The current stop is mirrored in the URL hash (`#works/kuechenschelle`) so stops are linkable and Back works. Switching views keeps the current stop.

### Catalogue view

The existing page, corrected rather than rebuilt:

- Hero text shows immediately. The lion is a still image in this view: a webp render of the lit statue at Felix's tuned placement, with the same bottom fade. No Three.js and no model download in the catalogue; the 3D lion lives in the gallery's Rotunda. The "gallery is opening" curtain and the hero WebGL scene are retired from this view. (My call.)
- Room II becomes a gallery wall listing all three works at once as plain images in CSS frames, each with the full wall label: the Küchenschelle triptych in gilded frames, the two Studies in plainer ones. The WebGL carousel is retired.
- Stats block and globe removed. Bio replaced with real copy.
- Room III gets `id="visitors-book"` and a nav entry; nav labels match the room names.
- Contact keeps the letter and adds a CV download and LinkedIn and GitHub links. Contact intro copy rewritten for employers.
- Footer drops the Terms & Conditions link (the page and route are removed); Privacy Policy stays.
- Body font fixed: the Fontshare request currently returns only Boska, so General Sans never loads and body text falls back to Helvetica or Arial. Self-host both families as woff2 in `public/assets/fonts` with `@font-face` and `font-display: swap`.

### Gallery view

- One full-viewport fixed canvas, one renderer, one scene. The three existing WebGL contexts (hero, globe, projects) are not used in this view.
- Movement: there is no separate spacer. The stops are in-flow `section`s in document order and their heights are the scroll height. Each section is a travel zone (empty, about one viewport, the camera glides during it) followed by its label content in normal flow. While the label content scrolls through the viewport the camera holds at the stop, so a label or form taller than the screen simply scrolls natively and the visitor is never stuck. Scroll position maps to progress along a Catmull-Rom camera path with a look-at target per segment. CSS scroll snap (`proximity`) settles on the start of each label. Key and floor plan navigation call `scrollTo` with smooth behavior, so there is one source of truth for position. (My call.)
- The default-view rule also requires a viewport height of at least 700px.
- Architecture: the enfilade runs along one axis so the path is nearly straight, with a turn toward the wall at each piece. Rooms are separated by door openings with gold architraves.
- Geometry is procedural: boxes and planes for walls, floor, cornice, plinth, frames, lectern, desk. Materials reuse the tokens: graphite plaster walls, darker stone floor, bone matting, gold frames and rules.
- Lighting: low ambient, one spotlight per piece, the existing key and rim on the lion. Shadows only on the lion. Spot intensity for a piece rises as the camera approaches it.
- Wall labels, room labels, the form, and the floor plan are HTML positioned over the canvas, not textures. Text stays selectable, translatable, and accessible.
- The lion loads after first paint. Until it arrives the Rotunda shows an empty lit plinth. Project screenshots load lazily per room.
- Rendering is on demand: the loop renders only while the camera, lights, or look offset are changing, and stops when the tab is hidden.
- Pixel ratio capped at 2. Target 60 fps on an integrated laptop GPU. If the first 60 frames average under 30 fps, offer the catalogue through a non-blocking notice.
- The cursor torch is off in gallery view (the scene has real lights) and stays in the catalogue.

### Accessibility

- The catalogue is the fully accessible baseline and is one click away at all times.
- In gallery view the canvas is `aria-hidden`. The stops exist as real DOM in document order: each is a `section` with its heading and label content, so screen readers and keyboard users get the whole collection without the canvas.
- Focus moving into a stop's section travels the camera to that stop. Arriving at a stop by keyboard navigation moves focus to its heading. Room changes are announced through a polite live region.
- If a visitor with `prefers-reduced-motion` opts into the gallery, travel becomes a cross-fade between stops instead of a glide.
- Floor plan buttons are at least 24 by 24 px, have visible focus, and carry `aria-current` for the active room.
- Label panels use bone on graphite-800 and gold only at the contrast-safe sizes already in use.
- Icons are inline SVG. The current arrow PNGs and the Unicode arrow glyphs in links are replaced.

### Content model

`Project` gains: `slug`, `year`, `kind` (`'commission' | 'study'`), `role`, `problem`, `built`, `outcome` (commission only), `href` (optional, live site), `repo` (optional), `screenshots` (webp, one or more, each with a caption). A study's label says plainly that it is in progress. `tags` drops the unused logo path. Bio, quotes, and contact details move into typed content files next to the projects.

Copy is Felix's. The builder drafts every text from what the repos and the current site say, marks the drafts in one review list, and Felix corrects them. Facts the builder cannot know are listed under "Needed from Felix".

Source repos, all local under `~/Documents/Projects/Monorepos/`: `kuechenschelle`, `wheelwallet-monorepo`, `re-loo-nx`. Read-only for this work.

Screenshots: Küchenschelle is captured from the live site as three desktop landscape views (16:10) for the triptych, with the phone view in "closer look". The admin dashboard view needs a login; if Felix prefers not to share one, the third frame shows a second public page instead. For the two Studies the builder captures a desktop view from a local dev run where the app starts with its seed data, and otherwise reuses the existing phone screenshot in a portrait frame. (My call.)

### Code placement

New code follows the feature layout from Felix's global rules; untouched code stays where it is.

- `src/app/features/gallery/`: scene, camera path, stop registry, floor plan, label overlays.
- `src/app/features/catalogue/`: the corrected flat view (existing sections move here only as they are touched).
- `src/app/shared/`: wall label, room label, gilded frame (CSS), icon components used by both views.
- `src/app/core/`: view-mode service (signal-based), content services.

New components use OnPush, signals, `input()`/`output()`, `inject()`, the `host` object, native control flow, and three files per component. The contact form is converted to a reactive form while it is being touched.

The Three.js chunk is loaded only when the gallery view is entered.

### Budgets

- HTML text of the entrance visible within 1 s on broadband, independent of 3D.
- New image assets for the gallery: 1.5 MB total at most; each screenshot 150 KB at most.
- Unused assets removed from `public/`: `future-phone.glb`, `me.png`, `grid2.png`, `grid3.png`, `grid4.png`, the GreenWave texture, tutorial icon leftovers.

### Verification

Per Felix's standing preference for design work: production build plus Playwright screenshots of every stop in both views at 1440, 768, and 390 widths, a keyboard-only walk of the whole route, and an axe run on both views with zero violations. After implementation: comment pass, code review, security review, then tests (Karma with the `ChromeHeadlessWebGL` launcher).

### Phasing

1. **Content and catalogue.** Content model, real copy drafts, font fix, gallery wall, nav and id fixes, instant hero text, asset cleanup. Ships on Angular 19.

   Between 1 and 2: upgrade to Angular 21 and zoneless, confirm build and tests, no visible change.
2. **The building.** Scene, rooms, lighting, camera path, scroll mapping, stops with HTML labels, view switch.
3. **Wayfinding and polish.** Floor plan, hash sync, closer-look lightbox, reduced-motion cross-fade, performance fallback notice.

## Needed from Felix

1. A current CV as a PDF for the download link.
2. Whether a login for the Küchenschelle admin dashboard can be used for one screenshot.
3. Review of the drafted copy (bio, the Vienna line, three wall labels, contact intro) when phase 1 presents it.

## Left to the builder

- Exact room dimensions, camera heights, spline control points, easing curves, light intensities.
- Scroll range per stop and snap tuning.
- Floor plan drawing (inline SVG).
- Lightbox implementation.
- Internal structure of the scene code.
