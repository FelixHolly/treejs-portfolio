import { Injectable } from "@angular/core";
import { Project } from "../models/project.model";

@Injectable({
  providedIn: "root",
})
export class ProjectService {
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
