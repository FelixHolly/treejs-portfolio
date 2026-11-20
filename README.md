# Felix Hollndonner: Portfolio

My portfolio, built with **Angular** and **Tailwind CSS** and designed as a museum: Stone & Gold palette, gallery rooms with wall labels, a Viennese lion at the entrance, and the works hung in gilded frames.

The site has two views of the same collection:

- **The gallery**: a guided walk through a small 3D museum (Three.js). Scrolling, the arrow keys or the floor plan move the camera from stop to stop: the rotunda with the lion, then Rooms I to IV. It opens by default on desktop-sized screens with a mouse and WebGL.
- **The catalogue**: a fast flat page with the same content. It opens on phones, with reduced motion or data saver, and whenever the visitor chooses it.

`?view=gallery` or `?view=catalogue` forces a view, and every stop has its own link, for example `/#works/kuechenschelle`. The design is described in `docs/superpowers/specs/2026-11-12-walkable-gallery-design.md`.

[Live Site](https://felixhollndonner.com)

---

## Tech Stack

- Angular 21 (zoneless)
- Tailwind CSS
- Three.js (gallery view, loaded on demand)
- GitHub Pages (for deployment)

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/felixholly/treejs-portfolio.git
   cd treejs-portfolio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the dev server**:
   ```bash
   ng serve
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Lint and test**:
   ```bash
   npm run lint
   npm test -- --watch=false --browsers=ChromeHeadlessWebGL
   ```

---

## Deployment

This project uses [GitHub Actions](https://github.com/JamesIves/github-pages-deploy-action) to automatically deploy to GitHub Pages from the `main` branch. The workflow lints, tests and builds, then pushes the output to the `gh-pages` branch.

The site is served from the root of its own domain, so the base href stays `/` (set in `src/index.html`). A relative base href breaks any URL with a trailing slash or a nested path.

---

## Assets & Attribution

- **Löwe (Vienna lion statue)** by [noe-3d.at](https://sketchfab.com/3d-models/lowe-3396c1f61742469ea956b1320d22eb95), licensed under [Creative Commons CC0](https://creativecommons.org/publicdomain/zero/1.0/). The entrance image is rendered from this model.
- **Boska** and **General Sans** by Indian Type Foundry, self-hosted under the [Fontshare free font licence](https://www.fontshare.com/licenses/itf-ffl).
- **JetBrains Mono** by JetBrains, self-hosted under the [SIL Open Font License 1.1](https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt).

---

## License

This project is for **personal portfolio use**. All code is © Felix Hollndonner.

---

## Contact

- [LinkedIn](https://www.linkedin.com/in/felixhollndonner/)
- [GitHub](https://github.com/felixhollndonner)
