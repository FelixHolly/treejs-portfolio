export interface CorrespondenceLink {
  label: string;
  href: string;
}

/** A way into the letter: a chip that writes its first words for the visitor. */
export interface LetterStarter {
  label: string;
  opening: string;
}

export const CORRESPONDENCE: {
  intro: string;
  starters: readonly LetterStarter[];
  cvHref: string | null;
  links: readonly CorrespondenceLink[];
} = {
  intro:
    "Hiring for a full-stack role, or want to talk a project through? A few lines are enough. I read every letter myself and write back.",
  starters: [
    { label: "A role", opening: "I'm hiring for " },
    { label: "A project", opening: "I have a project in mind: " },
    { label: "Just hello", opening: "I came across your portfolio and wanted to say " },
  ],
  cvHref: null,
  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/felix-hollndonner" },
    { label: "GitHub", href: "https://github.com/FelixHolly" },
  ],
};
