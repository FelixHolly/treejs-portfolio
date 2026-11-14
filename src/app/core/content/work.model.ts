export type WorkKind = "commission" | "study";

export interface WorkImage {
  src: string;
  alt: string;
  caption: string;
  orientation: "landscape" | "portrait";
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
}
