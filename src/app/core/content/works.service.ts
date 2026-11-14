import { Injectable } from "@angular/core";
import { Work } from "./work.model";
import { WORKS } from "./works.content";

@Injectable({ providedIn: "root" })
export class WorksService {
  works(): readonly Work[] {
    return WORKS;
  }

  bySlug(slug: string): Work | undefined {
    return WORKS.find((work) => work.slug === slug);
  }
}
