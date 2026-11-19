export const DEVELOPER = {
  greeting: "Hi, I'm Felix",
  bio: [
    "I build web applications end to end: Angular in front, Java and Spring Boot behind it, PostgreSQL underneath, and the deployment that keeps it all running.",
    "After three years in product teams at Polypoint and Eurotours, I designed, built and now operate Küchenschelle, a recipe platform with over a thousand recipes in production. I care about software that is fast, accessible and plain to maintain.",
  ],
  location: "Based in the United States",
  viennaLine:
    "The lion at the entrance is a Viennese Löwe. My first teams and clients were in Austria and Switzerland.",
  frieze: ["Angular", "TypeScript", "Java", "Spring Boot", "Tailwind", "NgRx", "Docker"],
  /** Skills by area: one plaque each on Room I's wall, one column each in the catalogue. */
  skills: [
    { area: "Frontend", tools: ["Angular", "TypeScript", "NgRx", "Tailwind"] },
    { area: "Backend", tools: ["Java", "Spring Boot"] },
    { area: "Data and operations", tools: ["PostgreSQL", "Docker"] },
  ],
} as const;
