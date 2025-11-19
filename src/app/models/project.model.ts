/**
 * Technology tag representing a tool or framework used in a project.
 *
 * Tags are displayed as icons with labels in the project showcase.
 */
export interface ProjectTag {
  /** Display name of the technology (e.g., "Angular", "Java") */
  name: string;
  /** Path to the technology logo SVG in assets folder */
  path: string;
}

/**
 * Portfolio project data structure.
 *
 * Each project is displayed on the 3D phone model in the projects section.
 * The texture field must point to a WebP image optimized for the phone screen
 * (recommended dimensions: 1080x2340 for realistic phone aspect ratio).
 */
export interface Project {
  /** Project name displayed as heading */
  title: string;
  /** Brief one-line description */
  desc: string;
  /** Extended description providing more context */
  subdesc: string;
  /** Path to project screenshot texture (displayed on 3D phone screen) */
  texture: string;
  /** Technologies used in the project */
  tags: ProjectTag[];
  /** Live demo URL or project repository link */
  href: string;
}
