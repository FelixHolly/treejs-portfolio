export interface CorrespondenceLink {
  label: string;
  href: string;
}

export const CORRESPONDENCE: {
  addressee: string;
  room: string;
  invitation: string;
  cvHref: string | null;
  links: readonly CorrespondenceLink[];
} = {
  addressee: "Felix Hollndonner",
  room: "Room IV, Correspondence",
  invitation: "Hiring for a role, or want to talk a project through? A few lines are enough.",
  cvHref: null,
  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/felix-hollndonner" },
    { label: "GitHub", href: "https://github.com/FelixHolly" },
  ],
};
