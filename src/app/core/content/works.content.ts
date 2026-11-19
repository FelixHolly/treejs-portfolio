import { Work } from "./work.model";

/** Hanging order of Room II. Küchenschelle, the finished commission, stays first. */
export const WORKS: readonly Work[] = [
  {
    slug: "kuechenschelle",
    title: "Küchenschelle",
    kind: "commission",
    year: "2025 to 2026",
    materials: ["Angular", "Spring Boot", "PostgreSQL", "Docker"],
    role: "Sole developer: design, frontend, backend, infrastructure and operations.",
    problem:
      "An Austrian YouTube cooking channel had more than a thousand recipes locked inside videos, with nowhere to search, read or print them.",
    built:
      "A server-rendered recipe site with search and filters, plus an admin dashboard that imports the channel's videos and turns them into structured recipes.",
    outcome:
      "Live at kuechenschelle.at with over 1,000 recipes, deployed automatically to a self-managed server with zero-downtime releases.",
    href: "https://kuechenschelle.at",
    images: [
      {
        src: "assets/works/kuechenschelle-home.webp",
        alt: "Küchenschelle home page with the headline Kochen, wie's daheim schmeckt and a portrait of the host",
        caption: "Fig. I · Home",
        orientation: "landscape",
      },
      {
        src: "assets/works/kuechenschelle-recipe.webp",
        alt: "A Küchenschelle recipe page with ingredients, steps and the embedded video",
        caption: "Fig. II · Recipe",
        orientation: "landscape",
      },
      {
        src: "assets/works/kuechenschelle-recipes.webp",
        alt: "The Küchenschelle recipe index with search, filters and 1082 recipes found",
        caption: "Fig. III · Index",
        orientation: "landscape",
      },
    ],
    detailImages: [
      {
        src: "assets/works/kuechenschelle-phone.webp",
        alt: "The Küchenschelle home page on a phone",
        caption: "Fig. IV · On a phone",
        orientation: "portrait",
        aspect: "780 / 1328",
      },
    ],
    caseStudy: [
      {
        heading: "How it is built",
        text: "One Angular 21 app serves both the public site, rendered on the server so recipes load fast and search engines can read them, and the admin area, rendered in the browser. Behind it sit a Spring Boot 4 API on Java 21 with PostgreSQL 17, and a small Python service for imports. Caddy stands in front and handles HTTPS.",
      },
      {
        heading: "From video to recipe",
        text: "The import reads a video's details and transcript, and a language model drafts a structured recipe from them. A vocabulary check and a normaliser clean the draft, and a person reviews it in the admin before anything is published.",
      },
      {
        heading: "Two decisions",
        text: "Search runs on an in-memory index of every published recipe instead of a cache per filter combination, so result counts and filter counts always agree; past about two thousand recipes I would revisit it. Releases are blue and green: a new backend must pass its health check before traffic moves to it, a failed release rolls back by itself, and every database change is written so the previous release keeps working.",
      },
      {
        heading: "In numbers",
        text: "About 2,500 frontend tests, including automated accessibility checks, and about 1,000 backend tests run before every release. The whole platform runs on one small server for about nine euros a month.",
      },
    ],
    film: {
      src: "assets/works/kuechenschelle-film.webm",
      description:
        "A silent twelve-second visit to kuechenschelle.at: the home page, the recipe index, a search for Strudel, and a recipe scrolled to its ingredients.",
    },
  },
  {
    slug: "wheelwallet",
    title: "WheelWallet",
    kind: "study",
    year: "2025 to present",
    materials: ["Angular", "Spring Boot", "PostgreSQL"],
    role: "Personal project, built alone.",
    problem:
      "A collector car's value rests on its paper trail, and that trail usually lives in folders and memory.",
    built:
      "A private register of a vehicle's provenance: documents, service events, mileage and ownership in one record. In progress, not yet released.",
    images: [
      {
        src: "assets/works/wheelwallet.webp",
        alt: "WheelWallet garage screen on a phone showing a car with its mileage and registration details",
        caption: "Study · Garage",
        orientation: "portrait",
      },
    ],
  },
  {
    slug: "reloo",
    title: "ReLoo",
    kind: "study",
    year: "2025 to present",
    materials: ["Angular", "Spring Boot", "PostgreSQL", "Leaflet"],
    role: "Personal project, built alone.",
    problem:
      "Whether an item can be recycled depends on where you live, and the local rules are hard to find.",
    built:
      "A recycling assistant that answers by location: search an item and get the rule for your postcode. In progress, not yet released.",
    images: [
      {
        src: "assets/works/reloo.webp",
        alt: "ReLoo dashboard on a phone with an impact score, scan count and quick actions",
        caption: "Study · Dashboard",
        orientation: "portrait",
      },
    ],
  },
  {
    slug: "this-gallery",
    title: "This Gallery",
    kind: "self-portrait",
    year: "2026",
    materials: ["Angular", "Three.js", "TypeScript"],
    role: "Design and build.",
    problem:
      "A portfolio usually tells you its author cares about craft. I wanted one that shows it before you read a word.",
    built:
      "A small museum you walk through by scrolling: a building drawn with Three.js inside an Angular app, and a flat catalogue of the same content for phones, reduced motion and slower devices.",
    outcome:
      "Every stop has its own link, the keyboard walks the whole route, automated accessibility checks find no violations, and the scene draws nothing while you stand still.",
    repo: "https://github.com/FelixHolly/treejs-portfolio",
    images: [
      {
        src: "assets/works/this-gallery-entrance.webp",
        alt: "The entrance of this gallery: the name Felix Hollndonner above a stone lion on a plinth, between plaques to enter the gallery or read the catalogue",
        caption: "Self-portrait · Entrance",
        orientation: "landscape",
      },
    ],
    detailImages: [
      {
        src: "assets/works/this-gallery-room-1.webp",
        alt: "Room I of this gallery: a gilded frame holding a section drawing of a web application, beside the label The Developer",
        caption: "Fig. II · Room I",
        orientation: "landscape",
      },
      {
        src: "assets/works/this-gallery-room-4.webp",
        alt: "Room IV of this gallery: a brass letterbox above a writing desk with a lit lamp, beside a sheet of letter paper headed Write to me",
        caption: "Fig. III · Room IV",
        orientation: "landscape",
      },
    ],
  },
];
