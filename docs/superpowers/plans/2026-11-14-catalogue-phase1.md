# Catalogue (Walkable Gallery Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tutorial-template skeleton and filler content of the flat page with the corrected "catalogue" view: typed content, real copy drafts, instant hero text with a still lion, a three-work gallery wall, fixed fonts and wayfinding.

**Architecture:** All copy and project data move into typed content files under `core/content`. The existing sections move into `features/catalogue/` as they are rewritten and render only from that content. Phase 1 removes every WebGL scene from the page; the 3D returns in phase 2 as a separate gallery view.

**Tech Stack:** Angular 19 (zone.js, unchanged in this phase), Tailwind 3, SCSS, Karma/Jasmine, Playwright (borrowed from `~/Documents/Projects/Monorepos/kuechenschelle/node_modules/playwright`) for screenshots.

**Spec:** `docs/superpowers/specs/2026-11-12-walkable-gallery-design.md` (approved 2026-11-14). This plan covers "Catalogue view", "Content model", "Code placement", "Budgets" and phase 1 of "Phasing". The gallery view, view switch, floor plan and Angular upgrade are out of scope.

## Global Constraints

- Branch: `feat/catalogue-phase1`, cut from `main`. Never commit on `main`.
- Commit messages: conventional commits, no `Co-Authored-By` trailer, no `Claude-Session` line, no AI attribution anywhere.
- No em dashes in any copy or comment.
- Icons and symbols are inline SVG. No Unicode arrows or glyphs, no PNG arrow icons.
- New and rewritten components: `ChangeDetectionStrategy.OnPush`, no `standalone: true`, `inject()`, `input()`/`output()`, signals, `host` object (no `@HostListener`/`@HostBinding`), native control flow, `[class.x]` (no `ngClass`), three files per component unless the template is under about 15 lines.
- Forms are reactive. No `FormsModule`/`ngModel`.
- No barrel files. `shared/` never imports from `features/`.
- SCSS: `@use` only, no `@import`. No `border-left` accent on cards.
- Comments: only where the code cannot say it, two lines at most, never narrating the change.
- Palette and type tokens stay as defined in `tailwind.config.js`: graphite `#141417`, graphite-800 `#1B1B1F`, graphite-700 `#26262C`, stone `#8E8B84`, bone `#E8E5DE`, gold `#C7A44A`, gold-dim `#8F7534`; Boska display, General Sans body, JetBrains Mono utility.
- Küchenschelle is always the first work.
- Location copy says "Based in the United States". Do not change it to Austria.
- No visible email address anywhere on the site.
- The source repos under `~/Documents/Projects/Monorepos/` (`kuechenschelle`, `wheelwallet-monorepo`, `re-loo-nx`) are read-only.
- Budgets: each new image at most 150 KB; hero name visible as text without waiting on any image, model or script beyond the app bundle.
- Order of work per Felix's rules: implement, then comment pass, `/requesting-code-review`, `/security-review`, then tests. Existing specs must keep passing throughout (`ng test --watch=false --browsers=ChromeHeadlessWebGL`).
- Library questions go to the `context7` MCP, not memory. The `angular-cli` MCP is not available in the planning session; if it is also missing at build time, say so before relying on `context7` alone.

## Review Focus

1. **Web fonts blocked or slow.** Text must render at once in the fallback and swap without the hero name changing line count at 390px. Pinned in Task 1.
2. **Lion still image fails to load.** The hero must stay fully readable and the canvas-era `aria-label` must not point at a missing image. Pinned in Task 3.
3. **A study with no `href`, `repo` or `outcome`.** The wall label must render no empty link, no empty paragraph and no dangling separator. Pinned in Task 5.
4. **Contact form submitted empty, or the mail service rejects.** Errors must show per field, focus must move to the first invalid field, and a failed send must keep what the visitor typed. Pinned in Task 6.
5. **Old links.** `/#projects`, `/#about` and `/terms-conditions` are in the wild (LinkedIn, search results). The hashes must still land on the right room and the removed route must fall back to the home page. Pinned in Task 6.

---

### Task 1: Self-hosted fonts

**Files:**
- Create: `public/assets/fonts/` (woff2 files), `src/styles/_fonts.scss`
- Modify: `src/index.html`, `src/styles.scss`

**Interfaces:**
- Produces: font families `'Boska'` (400, 500, 700), `'General Sans'` (400, 500, 600), `'JetBrains Mono'` (400, 500), all `font-display: swap`.

- [ ] **Step 1: Branch.** `git switch -c feat/catalogue-phase1`
- [ ] **Step 2: Fetch the files.** Download Boska and General Sans from Fontshare's family download (free licence, self-hosting allowed) and JetBrains Mono from its GitHub release. Keep only the woff2 weights listed above. Record the licence source in `README.md` under attribution.
- [ ] **Step 3: Declare them** in `src/styles/_fonts.scss` with `@font-face`, relative `url('/assets/fonts/...')` that resolve under the `--base-href ./` deploy, and `@use 'styles/fonts'` from `styles.scss`.
- [ ] **Step 4: Remove** the four `preconnect` links and both remote stylesheet links from `index.html`. Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for Boska 500 and General Sans 400 only.
- [ ] **Step 5: Verify.** Serve the production build and run a Playwright check that `[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family)` contains `General Sans`, and that no request goes to `fontshare.com`, `googleapis.com` or `gstatic.com`.
- [ ] **Step 6: Verify the fallback.** Block `**/*.woff2` in Playwright at 390px width; the hero name still renders on two lines and nothing overflows horizontally.
- [ ] **Step 7: Commit.** `fix(fonts): self-host Boska, General Sans and JetBrains Mono`

---

### Task 2: Content model and data

**Files:**
- Create: `src/app/core/content/work.model.ts`, `works.content.ts`, `developer.content.ts`, `visitors-book.content.ts`, `correspondence.content.ts`, `works.service.ts`
- Delete: `src/app/models/project.model.ts`, `src/app/services/project.service.ts`, `src/app/services/project.service.spec.ts` (replaced in Task 8)
- Create (assets): `public/assets/works/kuechenschelle-{home,recipe,third,phone}.webp`, `wheelwallet.webp`, `reloo.webp`

**Interfaces:**
- Produces:

```ts
export type WorkKind = 'commission' | 'study';
export interface WorkImage { src: string; alt: string; caption: string; orientation: 'landscape' | 'portrait'; }
export interface Work {
  slug: string; title: string; kind: WorkKind; year: string;
  materials: string[]; role: string; problem: string; built: string;
  outcome?: string; href?: string; repo?: string;
  images: [WorkImage, ...WorkImage[]];
}
// works.service.ts, providedIn: 'root'
works(): readonly Work[];            // order: kuechenschelle, wheelwallet, reloo
bySlug(slug: string): Work | undefined;
```

```ts
// developer.content.ts
export const DEVELOPER: { greeting: string; bio: string[]; viennaLine: string; location: string; frieze: string[] };
// visitors-book.content.ts
export const VISITOR_ENTRIES: { quote: string; role: string; company: string }[];
// correspondence.content.ts
export const CORRESPONDENCE: { intro: string; cvHref: string | null; links: { label: string; href: string }[] };
```

- [ ] **Step 1: Read the three source repos** (README, routes, main features, first and last commit dates) and draft `role`, `problem`, `built`, `year` for each work, plus `outcome` for Küchenschelle only. Two sentences each at most, written for a hiring manager, first person, concrete. Studies end `built` with a plain statement that the work is in progress.
- [ ] **Step 2: Draft the developer copy.** `bio`: two short paragraphs without "passionate", without stats. `location`: "Based in the United States". `viennaLine`: one sentence connecting Felix to Vienna and the lion; if the repos give no fact to base it on, write it as a neutral statement about the statue being the Viennese Löwe and flag it for Felix. `frieze`: Angular, TypeScript, Java, Spring Boot, Tailwind, NgRx, Docker.
- [ ] **Step 3: Fill the remaining content.** `VISITOR_ENTRIES`: the two existing quotes verbatim, roles "Team Lead" (Polyoint AG) and "Tech Lead" (Eurotours); do not alter either. `CORRESPONDENCE.intro`: one or two sentences for employers. `cvHref: null` until Felix supplies the PDF. `links`: GitHub `https://github.com/FelixHolly`, LinkedIn `https://www.linkedin.com/in/felix-hollndonner`.
- [ ] **Step 4: Capture images.** Küchenschelle from `https://kuechenschelle.at` at 1440x900: home, one recipe page, and a second public page for the third frame (no login is available); phone view at 390 wide. Studies: try a desktop capture from a local dev run with seed data (WheelWallet may already be serving on port 4300); if the app does not start within a reasonable try, convert the existing `public/assets/textures/projects/wheel-wallet.webp` / `reloo.webp` and mark `orientation: 'portrait'`. Encode with `sharp` (already a devDependency) to webp, each at most 150 KB.
- [ ] **Step 5: Set links.** Küchenschelle `href: 'https://kuechenschelle.at'`. No `href` on the studies. No `repo` on any work (none is public).
- [ ] **Step 6: Verify.** `npx tsc -p tsconfig.app.json --noEmit` passes once the consumers are updated in later tasks; for now confirm the content files compile in isolation and every `images[].src` exists on disk and is under 150 KB (`find public/assets/works -size +150k` prints nothing).
- [ ] **Step 7: Commit.** `feat(content): typed works and room content, GreenWave retired`

---

### Task 3: Entrance (hero) with instant text and a still lion

**Files:**
- Move: `src/app/sections/hero/` to `src/app/features/catalogue/entrance/` (`entrance.component.{ts,html,scss}`, selector `app-entrance`)
- Create: `public/assets/lion-{960,1600}.webp`
- Modify: `src/app/pages/home/home.component.{ts,html}`

- [ ] **Step 1: Render the still first, before touching the component.** With the current hero running at 1440x900 and at 390x844, wait until the lights are fully up, capture the canvas alone with a transparent background (`toDataURL` from a renderer created with `alpha: true` is already the case if the canvas has no clear colour; otherwise screenshot the canvas element over the page background). Mouse centred. Encode `lion-1600.webp` (desktop framing) and `lion-960.webp` (phone framing), each at most 150 KB.
- [ ] **Step 2: Rewrite the component** without Three.js: no canvas, no loader, no curtain, no `isLoading`. Template keeps the eyebrow, `h1`, plinth rule, stack line and the "View the works" link (to `#works`) with an inline SVG down arrow. The lion is an `<img>` using `NgOptimizedImage` with `priority`, `ngSrcset`/`sizes` for the two files, the same bottom `mask-image` fade as today, positioned behind the text, `alt="Statue of a Viennese lion, the Vienna Löwe"`.
- [ ] **Step 3: Keep the entrance choreography as pure CSS** that starts on first paint (no `.intro-go` gate): eyebrow, name, rule, row with the existing delays; the lion image fades in over 1.2s when its `load` event fires (a signal `lionReady`). Reduced motion: everything static.
- [ ] **Step 4: Verify instant text.** Playwright on the production build with slow 4G emulation (1.6 Mbps, 150 ms): `h1` has `opacity` 1 and is in the viewport within 1500 ms of the main bundle finishing, and before `lion-*.webp` finishes.
- [ ] **Step 5: Verify the failure case.** Block `**/lion-*.webp`: the hero text, rule and link render unchanged, no broken-image icon is visible (hide the `img` on `error`), no console error from the component.
- [ ] **Step 6: Screenshot** at 1440 and 390 and compare the lion placement against `scratchpad/shots/desk-01-hero.png` and `phone-01-hero.png` from the audit; it must sit where Felix tuned it.
- [ ] **Step 7: Commit.** `feat(entrance): instant name over a still lion, loading curtain removed`

---

### Task 4: Room I, The Developer

**Files:**
- Move: `src/app/sections/about/` to `src/app/features/catalogue/developer/` (selector `app-developer`)
- Create: `src/app/shared/room-label/room-label.component.ts` (inline template: `numeral` and `title` inputs, renders the existing `.room-label` markup with an `h2`)

**Interfaces:**
- Consumes: `DEVELOPER` from Task 2.
- Produces: `<app-room-label numeral="I" title="The Developer" />`, used by Tasks 5 and 6.

- [ ] **Step 1: Rewrite the room** to: room label, medallion beside `greeting` + `bio` paragraphs, the frieze (rendered with `@for` from `DEVELOPER.frieze`, separators carrying their own spaces as today), then a closing line with `location` and `viennaLine`. Section keeps `id="about"` (old links) and the reveal directive.
- [ ] **Step 2: Delete** the stats block, the globe, all Three.js code in this component, and the "Let's work together" button here.
- [ ] **Step 3: Verify.** `grep -rn "three" src/app/features/catalogue/developer` prints nothing; screenshot at 1440, 768, 390; the frieze wraps without overflow at 390.
- [ ] **Step 4: Commit.** `feat(developer): real wall text, stats and globe removed`

---

### Task 5: Room II, The Works as a gallery wall

**Files:**
- Create: `src/app/shared/wall-label/wall-label.component.{ts,html,scss}`, `src/app/shared/framed-image/framed-image.component.{ts,html,scss}`, `src/app/shared/icons/arrow-out.icon.ts`, `arrow-down.icon.ts` (inline SVG components, `aria-hidden="true"`)
- Move: `src/app/sections/projects/` to `src/app/features/catalogue/works/` (selector `app-works`)

**Interfaces:**
- Consumes: `WorksService.works()`, `Work`, `WorkImage`.
- Produces: `<app-wall-label [work]="work" />`, `<app-framed-image [image]="img" variant="gilded" | "plain" [size]="'large' | 'small'" />`.

- [ ] **Step 1: Build `app-framed-image`.** A `figure` with the image (`NgOptimizedImage`, `fill` inside an aspect-ratio box: 16/10 landscape, 9/19 portrait), bone matting, and a CSS frame: `gilded` uses the gold gradient bars of the current 3D frame's colours; `plain` is a thin graphite-700 moulding. `figcaption` shows `image.caption` in the `.exhibit-caption` style.
- [ ] **Step 2: Build `app-wall-label`.** Kind line in gold mono ("Commission" or "Study"), title (`h3`, Boska), `year` and `materials` joined with gold dots, then `role`, `problem`, `built`, and `outcome` only when present. Links row only when `href` or `repo` exists: "Visit the live site" and "View the code", each with the arrow-out icon, `target="_blank" rel="noopener noreferrer"`.
- [ ] **Step 3: Compose the room.** Section `id="projects"` with an inner anchor `id="works"`; room label "II / The Works". Each work is an `article` with `id="works-<slug>"`. Küchenschelle: triptych (large gilded centre, two small gilded flanks; stacked on mobile, centre first) with its label beneath on mobile and beside from `lg`. Studies: side by side from `md`, plain small frames, label under each.
- [ ] **Step 4: Delete** the carousel, the WebGL frame, the spinner, `left-arrow.png`/`right-arrow.png` usage and all Three.js code here.
- [ ] **Step 5: Verify the sparse-work case.** Temporarily render a work with no `href`, `repo`, `outcome`: the label has no empty `p`, no `a` without `href`, no trailing separator (assert `wall-label a:not([href])` and `wall-label p:empty` match nothing). Remove the temporary work.
- [ ] **Step 6: Screenshot** at 1440, 768, 390. All three works are visible without interaction; screenshot text inside the centre frame is legible at 1440.
- [ ] **Step 7: Commit.** `feat(works): gallery wall with commission triptych and two studies`

---

### Task 6: Rooms III and IV, navigation, footer, routes

**Files:**
- Move: `sections/testimonials/` to `features/catalogue/visitors-book/`; `sections/contact/` to `features/catalogue/correspondence/`; `sections/navbar/` and `sections/footer/` to `features/catalogue/navbar/` and `features/catalogue/footer/`; `pages/home/` to `features/catalogue/catalogue.component.*` with `features/catalogue/catalogue.routes.ts`
- Delete: `src/app/pages/terms-conditions/`, `public/assets/{menu,close}.svg` usages replaced by inline SVG icons in `shared/icons/`
- Modify: `src/app/app.routes.ts`, `src/app/components/torch/torch.component.ts`, `src/index.html`

- [ ] **Step 1: Visitors' Book.** Section `id="visitors-book"`, room label "III / Visitors' Book", entries from `VISITOR_ENTRIES`, attribution "`role` · `company`".
- [ ] **Step 2: Correspondence.** Room label eyebrow kept on the letter. Convert to a reactive form (`name` required, `email` required + `Validators.email`, `message` required), `loading` signal kept, submit through the existing `EmailService`. Each field gets `aria-describedby` to its error and `aria-invalid`; on invalid submit mark all touched and focus the first invalid control; on send failure keep the values. Under the form: "Download CV" (rendered only when `cvHref` is not null) and the `links`, each at least 24px tall. No email address.
- [ ] **Step 3: Navigation.** Links: Entrance (`#home`), The Developer (`#about`, I), The Works (`#projects`, II), Visitors' Book (`#visitors-book`, III), Correspondence (`#contact`, IV). Scroll-spy observes all five. Replace `ngClass` and the PNG/SVG image icons in the navbar with class bindings and inline SVG; move the skip link target to the `main` element and take the `header` out of `main`.
- [ ] **Step 4: Footer.** Remove the Terms & Conditions link; keep Privacy Policy, the two social links (inline SVG) and the copyright line.
- [ ] **Step 5: Routes.** `''` lazy-loads `catalogue.routes.ts`; `privacy-policy` stays; `terms-conditions` is removed so the existing `**` redirect sends it home. In the privacy policy page, remove any reference to the terms page.
- [ ] **Step 6: Torch and title.** Replace the torch's `@HostListener` with the `host` object. Set `<title>` to "Felix Hollndonner, Full-Stack Developer" and align the meta description with the new bio's first sentence.
- [ ] **Step 7: Verify old links.** Playwright: `/#projects`, `/#about`, `/#contact` each scroll the matching room label into view below the navbar; `/terms-conditions` ends at `/` with the entrance visible.
- [ ] **Step 8: Verify the form.** Submit empty: three inline errors, focus on the name field, no network call. With `EmailService` stubbed to reject: error toast shown, all three values still in the fields.
- [ ] **Step 9: Verify wayfinding.** Scrolling through the page, the active nav item reads III while the Visitors' Book is in the upper third of the viewport.
- [ ] **Step 10: Commit.** `feat(catalogue): rooms III and IV, room-named navigation, terms page removed`

---

### Task 7: Cleanup

**Files:**
- Delete: `public/assets/models/future-phone.glb`, `public/assets/{me,grid2,grid3,grid4,arrow-up,left-arrow,right-arrow}.png`, `public/assets/{copy,tick,figma,menu,close,github,linkedin}.svg` where no longer referenced, `public/assets/textures/`, `src/app/components/button/` if unreferenced, `src/app/services/three-scene.service.ts` if unreferenced, the now-empty `src/app/sections/`, `src/app/pages/home/`, `src/app/models/project.model.ts`
- Keep: `public/assets/models/vienna-lowe.glb`, `public/assets/draco/` and the `three` dependency (phase 2 needs them)
- Modify: `README.md`, `todos.md` (remove items this phase completed), `ngsw-config.json` (add `woff2` is already covered; confirm the asset glob still matches)

- [ ] **Step 1: Delete** each file only after `grep -rn "<basename>" src public/manifest.webmanifest` shows no reference.
- [ ] **Step 2: README.** Describe the catalogue and the planned gallery; replace the wrong 3D attributions (the phone and the "Leopard Tank" entry) with the lion's correct CC0 credit; add font licences; fix the placeholder contact email line by removing it.
- [ ] **Step 3: Verify.** `npm run build -- --configuration production` succeeds with the initial bundle under the 500 kB warning budget; `npm run lint` is clean; the production build makes no request for any `.glb`, `.wasm` or Three.js chunk on the home page.
- [ ] **Step 4: Commit.** `chore: remove template leftovers and unused assets`

---

### Task 8: Verification, reviews, tests, hand-back

- [ ] **Step 1: Full screenshot pass.** Production build, service workers blocked, every room at 1440, 768 and 390. Look at each image; fix anything that overflows, collides or looks unfinished.
- [ ] **Step 2: Accessibility.** Run axe-core (use the copy in the kuechenschelle `node_modules` if present, otherwise add `axe-core` as a devDependency) on the home page and privacy policy at 1440 and 390: zero violations. Keyboard-only walk from the skip link to the footer: every interactive element is reachable, has a visible focus ring, and the order follows the page.
- [ ] **Step 3: Load timing.** Repeat the audit's measurement against the production build: time to visible `h1` on broadband, fast 4G and slow 4G. Record the three numbers for the hand-back (audit baseline: 3.1 s, 4.4 s, 16.5 s).
- [ ] **Step 4: Comment pass.** Re-read every comment in `git diff main...` against the comment rule and delete those that restate code, narrate the change or exceed two lines.
- [ ] **Step 5: `/requesting-code-review`.** Ask the reviewer to also flag any comment that restates the code, narrates the change or exceeds two lines. Resolve findings.
- [ ] **Step 6: `/security-review`.** Resolve findings.
- [ ] **Step 7: Tests.** Replace the moved components' default specs and add:
  - `works.service.spec.ts`: order is `['kuechenschelle','wheelwallet','reloo']`; first work is a commission with `href` `https://kuechenschelle.at`; studies have no `href`; every image file responds 200 and no slug repeats.
  - `wall-label.component.spec.ts`: commission renders outcome and live link; a work without `href`/`repo`/`outcome` renders no link row and no empty paragraph.
  - `entrance.component.spec.ts`: `h1` text present on first render; image `error` hides the image and leaves the text.
  - `correspondence.component.spec.ts`: empty submit shows three errors and does not call `EmailService`; rejected send keeps values; resolved send resets the form; CV link absent when `cvHref` is null.
  - `nav-items.component.spec.ts`: five links in room order with numerals I to IV.
  - `app.routes` spec: `/terms-conditions` redirects to `''`.
  Run: `ng test --watch=false --browsers=ChromeHeadlessWebGL`. Expected: all pass.
- [ ] **Step 8: Commit.** `test(catalogue): cover content, wall label, entrance, correspondence and routes`
- [ ] **Step 9: Stop and hand back to Felix.** Do not merge, push or start the Angular upgrade. Present: screenshots of every room at desktop and phone width, the three load timings against the baseline, and the full drafted copy (bio, Vienna line, three wall labels, contact intro) as a list for his corrections, plus the two open items: CV PDF and the Küchenschelle dashboard login.
