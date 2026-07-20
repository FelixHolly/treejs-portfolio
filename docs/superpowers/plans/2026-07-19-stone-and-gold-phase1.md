# Stone & Gold Redesign — Phase 1 (Tokens + Hero + Navbar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the "Stone & Gold" design token system (graphite/stone/bone/gold palette, Boska display serif, JetBrains Mono utility face) and rebuild the hero as a museum-plinth presentation of the Vienna lion, plus align the navbar to the new identity.

**Architecture:** Angular 19 standalone components + Tailwind 3.4 (tokens live in `tailwind.config.js` and `@layer utilities` classes in `src/styles.scss`). The hero is a Three.js scene rendered into a canvas inside `HeroComponent`; lighting changes happen in `hero.component.ts`. No new dependencies.

**Tech Stack:** Angular 19, Tailwind CSS 3.4, SCSS, Three.js 0.177, Karma/Jasmine tests.

## Global Constraints

- Palette (exact, no other accent colors may be introduced or kept in touched code): graphite `#141417` (page background), graphite-800 `#1B1B1F` (surfaces), graphite-700 `#26262C` (borders), stone `#8E8B84` (muted text), bone `#E8E5DE` (primary text), gold `#C7A44A` (single accent), gold-dim `#8F7534`.
- Type roles: display = `Boska` (serif, Fontshare), body = `General Sans` (existing), utility/mono = `JetBrains Mono`. Display face is used ONLY for the hero name, section headings (`.head-text`), and the navbar wordmark — never for body copy.
- The blue focus outline `#3b82f6` is replaced by gold `#C7A44A` globally.
- No emoji anywhere in touched templates (the 👋 is removed, its `waving-hand` animation CSS is removed).
- `prefers-reduced-motion` support in `src/styles.scss` must remain untouched.
- Do not modify any files under `src/app/sections/about`, `projects`, `testimonials`, `contact`, or `footer` in this phase.
- Existing utility classes used by untouched sections (`.text-gray_gradient`, `.grid-container`, `.client-review`, etc.) must keep working — do not delete them.
- Hero CTA anchor target is `#projects` (existing section id).
- Canvas aria-label must read exactly: `3D model of a Viennese lion statue, the Vienna Löwe`.
- Verification commands: `npm run build` (must succeed), `npm run lint` (must pass), `npm test -- --watch=false --browsers=ChromeHeadlessWebGL` (specs must pass).

---

### Task 1: Design token foundation (fonts, palette, base styles)

**Files:**
- Modify: `src/index.html` (font `<link>` tags in `<head>`)
- Modify: `tailwind.config.js` (colors + fontFamily)
- Modify: `src/styles.scss` (remove cdnfonts import, body colors, focus color, new utilities, `.head-text` re-skin)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: Tailwind classes used by Tasks 2–4: `text-bone`, `text-stone`, `text-gold`, `bg-graphite`, `bg-graphite-800`, `border-graphite-700`, `font-display`, `font-mono`, and utility classes `.eyebrow`, `.plinth-rule`.

- [ ] **Step 1: Add font links to `src/index.html`**

Insert directly after the `<link rel="manifest" href="manifest.webmanifest">` line (line 25), before `</head>`:

```html
  <!-- Fonts: Boska (display) + General Sans (body) via Fontshare, JetBrains Mono (utility) via Google Fonts -->
  <link rel="preconnect" href="https://api.fontshare.com">
  <link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://api.fontshare.com/v2/css?f[]=boska@400,500,700&f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Also update the theme color on line 7 to match the new background:

```html
  <meta name="theme-color" content="#141417">
```

- [ ] **Step 2: Replace `tailwind.config.js` theme block**

Replace the entire file content with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts}'],
  safelist: [
    {
      pattern: /^(btn|hero_tag|nav-li|text-gray_gradient|grid-container|field-input|social-icon|eyebrow|plinth-rule).*$/,
    }
  ],
  theme: {
    extend: {
      fontFamily: {
        generalsans: ['General Sans', 'sans-serif'],
        display: ['Boska', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        black: {
          DEFAULT: '#000',
          100: '#010103',
          200: '#0E0E10',
          300: '#1C1C21',
          500: '#3A3A49',
          600: '#1A1A1A',
        },
        white: {
          DEFAULT: '#FFFFFF',
          800: '#E4E4E6',
          700: '#D6D9E9',
          600: '#AFB0B6',
          500: '#62646C',
        },
        graphite: {
          DEFAULT: '#141417',
          800: '#1B1B1F',
          700: '#26262C',
        },
        stone: '#8E8B84',
        bone: '#E8E5DE',
        gold: {
          DEFAULT: '#C7A44A',
          dim: '#8F7534',
        },
      },
    },
  },
  plugins: [],
}
```

Note: this intentionally overrides Tailwind's built-in `stone-*` scale; the codebase has zero usages of `stone-*` (verified by grep), so nothing breaks.

- [ ] **Step 3: Update `src/styles.scss`**

3a. Delete line 1 (the cdnfonts `@import url(...)` — fonts now load from `index.html`).

3b. Replace the `body` rule:

```scss
body {
  background: #141417;
  color: #E8E5DE;
  font-family: 'General Sans', sans-serif;
}
```

3c. In the global focus rule, change `outline: 2px solid #3b82f6;` to:

```scss
  outline: 2px solid #C7A44A;
```

3d. Inside `@layer utilities`, replace `.head-text`:

```scss
  .head-text {
    @apply sm:text-5xl text-4xl font-display font-medium text-bone;
  }
```

3e. Inside `@layer utilities`, add after `.head-text`:

```scss
  /* Stone & Gold identity utilities */
  .eyebrow {
    @apply font-mono uppercase tracking-[0.25em] text-xs sm:text-sm text-stone;
  }

  .plinth-rule {
    @apply h-px w-full bg-gradient-to-r from-transparent via-gold/70 to-transparent;
  }
```

3f. Leave `.waving-hand`, `@keyframes wave-animation`, and `.hero_tag` untouched in this task — the old hero template still uses them. Task 2 deletes them together with the old markup.

- [ ] **Step 4: Verify build and lint**

Run: `npm run build`
Expected: build succeeds, no Tailwind/PostCSS errors.

Run: `npm run lint`
Expected: passes.

- [ ] **Step 5: Verify tests still pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessWebGL`
Expected: all existing specs pass.

- [ ] **Step 6: Commit**

```bash
git add src/index.html tailwind.config.js src/styles.scss
git commit -m "feat(design): add Stone & Gold token system (palette, Boska display, JetBrains Mono)"
```

---

### Task 2: Hero content and layout (museum plinth)

**Files:**
- Modify: `src/app/sections/hero/hero.component.html` (full rewrite)
- Modify: `src/app/sections/hero/hero.component.scss` (loading overlay colors)
- Modify: `src/styles.scss` (remove `.waving-hand` + `@keyframes wave-animation`; remove `.hero_tag`)
- Test: `src/app/sections/hero/hero.component.spec.ts`

**Interfaces:**
- Consumes: `.eyebrow`, `.plinth-rule`, `font-display`, `text-bone`, `text-stone`, `text-gold` from Task 1. Component class `HeroComponent` (fields `isLoading`, `loadingProgress`, `Math`) is unchanged.
- Produces: hero template with `<h1>` "Felix Hollndonner" and canvas aria-label `3D model of a Viennese lion statue, the Vienna Löwe` (asserted by specs; Task 3 does not touch the template).

- [ ] **Step 1: Write failing tests**

Add to `src/app/sections/hero/hero.component.spec.ts` inside the existing `describe`:

```ts
  it("should render the name as the display heading", () => {
    const h1: HTMLElement | null = fixture.nativeElement.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(h1!.textContent).toContain("Felix Hollndonner");
  });

  it("should label the canvas as the Vienna lion statue", () => {
    const canvas: HTMLElement | null = fixture.nativeElement.querySelector("canvas");
    expect(canvas!.getAttribute("aria-label")).toBe(
      "3D model of a Viennese lion statue, the Vienna Löwe",
    );
  });

  it("should link the call to action to the projects section", () => {
    const cta: HTMLAnchorElement | null = fixture.nativeElement.querySelector("a[href='#projects']");
    expect(cta).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessWebGL`
Expected: the three new specs FAIL (no `h1`, wrong aria-label, no `#projects` anchor); the pre-existing "should create" spec still passes.

- [ ] **Step 3: Rewrite `src/app/sections/hero/hero.component.html`**

Replace the entire file with:

```html
<section class="relative w-full min-h-screen flex flex-col justify-between items-center pt-32 pb-10" id="home">
    <div class="z-10 flex flex-col items-center gap-4 c-space">
        <p class="eyebrow">Full-Stack Developer</p>
        <h1 class="font-display font-medium text-bone text-center leading-none text-5xl sm:text-6xl xl:text-8xl">
            Felix Hollndonner
        </h1>
    </div>

    <div class="z-10 w-full max-w-4xl flex flex-col items-center gap-5 c-space">
        <div class="plinth-rule"></div>
        <div class="flex flex-col sm:flex-row items-center sm:justify-between w-full gap-3">
            <p class="font-mono text-xs sm:text-sm text-stone tracking-wider">
                Angular · TypeScript · Java · Spring Boot
            </p>
            <a href="#projects" class="font-mono text-xs sm:text-sm text-gold tracking-wider hover:text-bone transition-colors">
                View my work ↓
            </a>
        </div>
    </div>

    @if (isLoading) {
        <div class="loading-overlay">
            <div class="flex flex-col justify-center items-center gap-4 font-mono">
                <p>Loading... {{ Math.round(loadingProgress) }}%</p>
                <div class="spinner"></div>
            </div>
        </div>
    }
    <canvas #canvas class="absolute inset-0 w-full h-full z-0 pointer-events-none" role="img" aria-label="3D model of a Viennese lion statue, the Vienna Löwe"></canvas>
</section>
```

- [ ] **Step 4: Update loading overlay in `src/app/sections/hero/hero.component.scss`**

Replace the `.loading-overlay` and `.spinner` rules with:

```scss
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  width: 100%;
  height: 100%;
  background: #141417;
  color: #8E8B84;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.spinner {
  border: 2px solid rgba(199, 164, 74, 0.15);
  border-top: 2px solid #C7A44A;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
```

(Keep `:host`, the `canvas` rule, and `@keyframes spin` unchanged.)

- [ ] **Step 5: Remove dead hero styles from `src/styles.scss`**

- Delete the `.hero_tag` utility (its only consumer was the old hero template).
- Delete the `.waving-hand` rule and the entire `@keyframes wave-animation` block at the bottom of the file.
- In `tailwind.config.js` safelist pattern, remove `hero_tag` from the alternation so it reads:

```js
      pattern: /^(btn|nav-li|text-gray_gradient|grid-container|field-input|social-icon|eyebrow|plinth-rule).*$/,
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessWebGL`
Expected: all specs PASS, including the three new hero specs.

- [ ] **Step 7: Verify build and lint**

Run: `npm run build` → succeeds.
Run: `npm run lint` → passes.

- [ ] **Step 8: Commit**

```bash
git add src/app/sections/hero/hero.component.html src/app/sections/hero/hero.component.scss src/app/sections/hero/hero.component.spec.ts src/styles.scss tailwind.config.js
git commit -m "feat(hero): museum-plinth hero with engraved name, plinth rule, and CTA"
```

---

### Task 3: Hero museum lighting and model placement

**Files:**
- Modify: `src/app/sections/hero/hero.component.ts` (lighting block ~lines 144–152, `calculateSizes` desktop branch)

**Interfaces:**
- Consumes: nothing from other tasks (template untouched — Task 2 owns it).
- Produces: nothing consumed later; purely visual scene changes.

- [ ] **Step 1: Replace the lighting setup**

In `ngAfterViewInit`, replace this block:

```ts
    const ambientLight = new AmbientLight(0xffffff, 1.5);
    const directionalLight = new DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = SHADOW_CONFIG.MAP_SIZE;
    directionalLight.shadow.mapSize.height = SHADOW_CONFIG.MAP_SIZE;
    directionalLight.shadow.camera.near = SHADOW_CONFIG.CAMERA_NEAR;
    directionalLight.shadow.camera.far = SHADOW_CONFIG.CAMERA_FAR;
    this.scene.add(ambientLight, directionalLight);
```

with:

```ts
    // Museum lighting: dim neutral ambient, warm key light (gallery spot),
    // cool rim light to separate the stone from the dark background
    const ambientLight = new AmbientLight(0xe8e5de, 0.5);

    const keyLight = new DirectionalLight(0xffd9a0, 2.4);
    keyLight.position.set(4, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = SHADOW_CONFIG.MAP_SIZE;
    keyLight.shadow.mapSize.height = SHADOW_CONFIG.MAP_SIZE;
    keyLight.shadow.camera.near = SHADOW_CONFIG.CAMERA_NEAR;
    keyLight.shadow.camera.far = SHADOW_CONFIG.CAMERA_FAR;

    const rimLight = new DirectionalLight(0x8fa3bf, 0.9);
    rimLight.position.set(-6, 3, -4);

    this.scene.add(ambientLight, keyLight, rimLight);
```

- [ ] **Step 2: Lower and slightly shrink the desktop model so it clears the headline**

In `calculateSizes`, replace the final return (the `>= 1024` branch):

```ts
  return {
    deskScale: 2.4,
    deskPosition: [0, -4.5, 0],
    deskRotation: [0, 0, 0],
  };
```

(Leave the three smaller breakpoints unchanged.)

- [ ] **Step 3: Verify tests, build, lint**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessWebGL` → all specs pass.
Run: `npm run build` → succeeds.
Run: `npm run lint` → passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/sections/hero/hero.component.ts
git commit -m "feat(hero): warm key + cool rim museum lighting, lower desktop model placement"
```

---

### Task 4: Navbar re-skin (wordmark + mono nav links)

**Files:**
- Modify: `src/app/sections/navbar/navbar.component.html`
- Modify: `src/styles.scss` (`.nav-li`, `.nav-li_a`, `.nav-sidebar` utilities)
- Test: `src/app/sections/navbar/navbar.component.spec.ts`

**Interfaces:**
- Consumes: `font-display`, `text-bone`, `text-gold`, `bg-graphite` tokens from Task 1.
- Produces: nothing consumed later.

- [ ] **Step 1: Write failing test**

Add to `src/app/sections/navbar/navbar.component.spec.ts` inside the existing `describe` (it already creates `fixture`; if the existing spec file's setup differs, follow its local pattern for creating the fixture):

```ts
  it("should render the wordmark in the display face", () => {
    const wordmark: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector("a[href='/#home']");
    expect(wordmark).toBeTruthy();
    expect(wordmark!.classList.contains("font-display")).toBeTrue();
    expect(wordmark!.textContent!.trim()).toBe("Felix Hollndonner");
  });
```

- [ ] **Step 2: Run tests to verify the new spec fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessWebGL`
Expected: new spec FAILS (wordmark lacks `font-display`, text is "Felix").

- [ ] **Step 3: Update `src/app/sections/navbar/navbar.component.html`**

Replace the header opening tag (line 2) with:

```html
<header class="fixed top-0 left-0 right-0 z-50 bg-graphite/90 backdrop-blur-sm border-b border-graphite-700/60">
```

Replace the wordmark anchor (lines 5–7) with:

```html
      <a href="/#home" class="font-display text-bone text-2xl tracking-wide hover:text-gold transition-colors">
        Felix Hollndonner
      </a>
```

In the mobile toggle button, change `class="text-neutral-400 hover:text-white sm:hidden flex"` to:

```html
        class="text-stone hover:text-bone sm:hidden flex"
```

- [ ] **Step 4: Update nav utilities in `src/styles.scss`**

Replace `.nav-li`, `.nav-li_a`, and `.nav-sidebar`:

```scss
  .nav-li {
    @apply text-stone hover:text-gold font-mono max-sm:hover:bg-graphite-800 max-sm:w-full max-sm:rounded-md py-2 max-sm:px-5;
  }

  .nav-li_a {
    @apply text-sm uppercase tracking-[0.15em] hover:text-gold transition-colors;
  }

  .nav-sidebar {
    @apply absolute left-0 right-0 bg-graphite-800 backdrop-blur-sm transition-all duration-300 ease-in-out overflow-hidden z-20 mx-auto sm:hidden block;
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --watch=false --browsers=ChromeHeadlessWebGL`
Expected: all specs PASS.

- [ ] **Step 6: Verify build and lint**

Run: `npm run build` → succeeds.
Run: `npm run lint` → passes.

- [ ] **Step 7: Commit**

```bash
git add src/app/sections/navbar/navbar.component.html src/app/sections/navbar/navbar.component.spec.ts src/styles.scss
git commit -m "feat(navbar): serif wordmark, mono uppercase nav links, gold hover accent"
```
