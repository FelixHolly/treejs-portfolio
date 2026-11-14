# Felix Hollndonner – 3D Portfolio Website

My portfolio, built with **Angular** and **Tailwind CSS** and designed as a museum: Stone & Gold palette, gallery rooms with wall labels, a Viennese lion at the entrance, and the works hung in gilded frames.

The page you see today is the **catalogue**, a fast flat view of the collection. A guided walkable 3D gallery (Three.js) is planned on top of the same content; see `docs/superpowers/specs/2026-11-12-walkable-gallery-design.md`.

[Live Site](https://felixhollndonner.com)

---

## Tech Stack

- Angular
- Tailwind CSS
- Three.js (for the planned gallery view)
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
   npm run build -- --configuration production --base-href ./
   ```

---

## Deployment

This project uses [GitHub Actions](https://github.com/JamesIves/github-pages-deploy-action) to automatically deploy to GitHub Pages from the `main` branch. Output is pushed to the `gh-pages` branch.

Make sure your `angular.json` has:

```json
"baseHref": "/treejs-portfolio/"
```

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
