export interface CorrespondenceLink {
  label: string;
  href: string;
}

export const CORRESPONDENCE: {
  intro: string;
  cvHref: string | null;
  links: readonly CorrespondenceLink[];
} = {
  intro:
    "Hiring for a full-stack role, or want to talk through a project? Write a few lines and I will reply within a couple of days.",
  cvHref: null,
  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/felix-hollndonner" },
    { label: "GitHub", href: "https://github.com/FelixHolly" },
  ],
};
