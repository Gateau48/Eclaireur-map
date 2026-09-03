import type { EditionData, Project, Promoter } from "./schema";

export type PanelView =
  | { type: "project"; project: Project; promoter: Promoter }
  | { type: "promoter"; promoter: Promoter };

export function findProjectAndPromoter(
  edition: EditionData,
  projectId: string
): { project: Project; promoter: Promoter } | null {
  for (const promoter of edition.promoters) {
    const project = promoter.projects.find((p) => p.id === projectId);
    if (project) return { project, promoter };
  }
  return null;
}

export function findPromoterById(edition: EditionData, promoterId: string): Promoter | null {
  return edition.promoters.find((p) => p.id === promoterId) ?? null;
}