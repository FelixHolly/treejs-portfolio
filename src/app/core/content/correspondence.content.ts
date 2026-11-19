export interface CorrespondenceLink {
  label: string;
  href: string;
}

/** What a letter can be about: the word printed on the "Re:" line, and the first words it writes for the visitor. */
export interface LetterTopic {
  word: string;
  opening: string;
}

export const CORRESPONDENCE: {
  addressee: string;
  room: string;
  intro: string;
  topics: readonly LetterTopic[];
  cvHref: string | null;
  links: readonly CorrespondenceLink[];
} = {
  addressee: "Felix Hollndonner",
  room: "Room IV, Correspondence",
  intro:
    "Hiring for a full-stack role, or want to talk a project through? A few lines are enough. I read every letter myself and write back.",
  topics: [
    { word: "a role", opening: "I'm hiring for " },
    { word: "a project", opening: "I have a project in mind: " },
    { word: "just a hello", opening: "I came across your portfolio and wanted to say " },
  ],
  cvHref: null,
  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/felix-hollndonner" },
    { label: "GitHub", href: "https://github.com/FelixHolly" },
  ],
};
