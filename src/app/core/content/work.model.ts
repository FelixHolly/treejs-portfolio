export type WorkKind = "commission" | "study" | "self-portrait";

/** How each kind of work is named on its label. */
export const KIND_LABEL: Record<WorkKind, string> = {
  commission: "Commission",
  study: "Study",
  "self-portrait": "Self-portrait",
};

/** One part of a longer account of a work, shown in its closer look. */
export interface CaseStudySection {
  heading: string;
  text: string;
}

export interface WorkFilm {
  src: string;
  /** What the film shows, for visitors who cannot watch it. */
  description: string;
}

export interface WorkImage {
  src: string;
  alt: string;
  caption: string;
  orientation: "landscape" | "portrait";
  /** Width over height as CSS `aspect-ratio`, for a picture that is neither a 16:10 screen nor a tall phone capture. */
  aspect?: string;
}

export interface Work {
  slug: string;
  title: string;
  kind: WorkKind;
  year: string;
  materials: string[];
  role: string;
  problem: string;
  built: string;
  outcome?: string;
  href?: string;
  repo?: string;
  images: [WorkImage, ...WorkImage[]];
  /** Extra views shown only in the closer look */
  detailImages?: WorkImage[];
  /** How it is built and why, for the closer look. */
  caseStudy?: CaseStudySection[];
  /** A short silent screen recording of the work in use. */
  film?: WorkFilm;
}
