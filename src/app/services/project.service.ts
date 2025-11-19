import { Injectable } from "@angular/core";
import { Project } from "../models/project.model";

/**
 * Service managing the portfolio project data.
 *
 * Currently uses in-memory data storage. For larger portfolios, consider:
 * - Moving to a CMS (Contentful, Strapi) for non-technical content updates
 * - Loading from JSON file for easier maintenance
 * - Adding filtering/sorting capabilities as project count grows
 *
 * The service provides a single source of truth for project data,
 * allowing for easy future expansion (e.g., featured projects, filtering by tech stack).
 */
@Injectable({
  providedIn: "root",
})
export class ProjectService {
  /**
   * Portfolio project collection.
   *
   * Projects are displayed in the order defined here.
   * Each project requires a corresponding screenshot texture in assets/textures/projects/
   */
  private projects: Project[] = [
    {
      title: "WheelWallet",
      desc: "All-in-one car manager.",
      subdesc: "Documents, maintenance, and trips.",
      texture: "assets/textures/projects/wheel-wallet.webp",
      tags: [
        { name: "Angular", path: "assets/logos/angular.svg" },
        { name: "Java", path: "assets/logos/java.svg" },
        { name: "SpringBoot", path: "assets/logos/spring.svg" },
      ],
      href: "https://wheelwallet-frontend.onrender.com",
    },
    {
      title: "ReLoo",
      desc: "Recycling buddy.",
      subdesc: "Helps users recycle items the correct way based on their location",
      texture: "assets/textures/projects/reloo.webp",
      tags: [
        { name: "Angular", path: "assets/logos/angular.svg" },
        { name: "Java", path: "assets/logos/java.svg" },
        { name: "SpringBoot", path: "assets/logos/spring.svg" },
        { name: "Leaflet", path: "assets/logos/leaflet.svg" },
      ],
      href: "https://re-loo-nx-frontend.vercel.app",
    },
    {
      title: "GreenWave",
      desc: "GPS traffic light optimizer.",
      subdesc: "Built with Angular + Leaflet + Crowdsourcing.",
      texture: "assets/textures/projects/greenwave.webp",
      tags: [
        { name: "Angular", path: "assets/logos/angular.svg" },
        { name: "Java", path: "assets/logos/spring.svg" },
        { name: "SpringBoot", path: "assets/logos/spring.svg" },
        { name: "Leaflet", path: "assets/logos/leaflet.svg" },
      ],
      href: "https://greenwave-webapp.onrender.com",
    },
  ];

  getProjects(): Project[] {
    return this.projects;
  }

  getProjectByIndex(index: number): Project | undefined {
    return this.projects[index];
  }

  getProjectsCount(): number {
    return this.projects.length;
  }
}
