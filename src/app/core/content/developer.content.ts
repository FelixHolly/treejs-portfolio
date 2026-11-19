export const DEVELOPER = {
  greeting: "Hi, I'm Felix",
  bio: [
    "I build web applications end to end: Angular in front, Java and Spring Boot behind it, PostgreSQL underneath, and the deployment that keeps it all running.",
    "After three years in product teams at Polypoint and Eurotours, I designed, built and now operate Küchenschelle, a recipe platform with over a thousand recipes in production. I care about software that is fast, accessible and plain to maintain.",
  ],
  location: "Based in the United States",
  viennaLine:
    "The lion at the entrance is a Viennese Löwe. My first teams and clients were in Austria and Switzerland.",
  /** `placeholder` marks the stand-in picture; it goes when the real photograph replaces the file. */
  portrait: { src: "assets/portrait.webp", alt: "Portrait of Felix Hollndonner", placeholder: true },
  /** Skills by area: one plaque each on Room I's wall, one column each in the catalogue. */
  skills: [
    { area: "Frontend", tools: ["Angular", "TypeScript", "RxJS", "NgRx Signals", "SCSS and Tailwind", "Three.js"] },
    { area: "Backend", tools: ["Java", "Spring Boot", "Spring Security", "JPA and Hibernate", "REST APIs", "Python"] },
    { area: "Data and operations", tools: ["PostgreSQL", "Flyway", "Docker", "GitHub Actions", "Linux servers", "S3"] },
    { area: "Quality", tools: ["Vitest and Jest", "Playwright and Cypress", "JUnit", "Accessibility testing", "Nx monorepos"] },
  ],
} as const;
