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
];
