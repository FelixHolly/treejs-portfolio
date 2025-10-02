export interface ProjectTag {
  name: string;
  path: string;
}

export interface Project {
  title: string;
  desc: string;
  subdesc: string;
  texture: string;
  tags: ProjectTag[];
  href: string;
}
