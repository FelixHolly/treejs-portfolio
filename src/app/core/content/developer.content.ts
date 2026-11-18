export const DEVELOPER = {
  greeting: "Hi, I'm Felix",
  bio: [
    "I build web applications end to end: Angular in front, Java and Spring Boot behind it, PostgreSQL underneath, and the deployment that keeps it all running.",
    "After three years in product teams at Polyoint and Eurotours, I designed, built and now operate Küchenschelle, a recipe platform with over a thousand recipes in production. I care about software that is fast, accessible and plain to maintain.",
  ],
  location: "Based in the United States",
  viennaLine:
    "The lion at the entrance is a Viennese Löwe. My first teams and clients were in Austria and Switzerland.",
  frieze: ["Angular", "TypeScript", "Java", "Spring Boot", "Tailwind", "NgRx", "Docker"],
  /** The layers of an application as the storeys of Room I's section drawing, from the roof down. */
  anatomy: [
    { caption: "What the visitor sees", tools: ["Angular", "TypeScript", "NgRx", "Tailwind"] },
    { caption: "Where the work is done", tools: ["Java", "Spring Boot"] },
    { caption: "Where it is kept", tools: ["PostgreSQL"] },
    { caption: "What it stands on", tools: ["Docker"] },
  ],
} as const;
