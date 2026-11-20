export const DEVELOPER = {
  greeting: "Hi, I'm Felix",
  bio: [
    "I lead and build web applications end to end: Java and Spring Boot at the core, Angular in front, PostgreSQL underneath, and the deployment that keeps it all running.",
    "In five years across Austria, Switzerland and the United States I built booking services at Eurotours and healthcare software at Polypoint. Today I am technical lead at United Portraits, moving a legacy PHP monolith to Java and Angular. On my own I designed, built and operate Küchenschelle, a recipe platform with over a thousand recipes in production.",
  ],
  location: "Based in the United States",
  viennaLine:
    "The lion at the entrance is a Viennese Löwe. My first teams and clients were in Austria and Switzerland.",
  portrait: { src: "assets/portrait.webp", alt: "Portrait of Felix Hollndonner" },
  /** Skills by area: one plaque each on Room I's wall, one column each in the catalogue. */
  skills: [
    { area: "Frontend", tools: ["Angular", "TypeScript", "RxJS", "NgRx Signals", "SCSS and Tailwind", "Three.js"] },
    { area: "Backend", tools: ["Java", "Spring Boot", "Spring Security", "JPA and Hibernate", "REST APIs", "Python"] },
    { area: "Data and operations", tools: ["PostgreSQL", "Flyway", "Docker", "GitHub Actions", "Linux servers", "AWS"] },
    { area: "Quality", tools: ["Vitest and Jest", "Playwright and Cypress", "JUnit", "Accessibility testing", "Nx monorepos"] },
  ],
} as const;
