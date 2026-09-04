import { normalize } from "@/lib/utils";
import type { SearchApiResult } from "@/app/api/search/[edition]/route";
import type { EditionData } from "@/lib/schema";

export function searchEdition(edition: EditionData, query: string): SearchApiResult[] {
  const nq = normalize(query);
  const results: SearchApiResult[] = [];

  for (const promoter of edition.promoters) {
    if (normalize(promoter.name).includes(nq)) {
      results.push({ kind: "promoter", promoterId: promoter.id, promoterName: promoter.name, name: promoter.name });
    }
    for (const project of promoter.projects) {
      const matchesName = normalize(project.name).includes(nq);
      const matchesDistrict = project.location.district
        ? normalize(project.location.district).includes(nq)
        : false;
      if (matchesName || matchesDistrict) {
        results.push({
          kind: "project",
          promoterId: promoter.id,
          promoterName: promoter.name,
          projectId: project.id,
          name: project.name,
          district: project.location.district ?? undefined,
          hasExactLocation: project.location.precision === "exact"
        });
      }
    }
  }

  results.sort((a, b) => Number(normalize(b.name).startsWith(nq)) - Number(normalize(a.name).startsWith(nq)));

  return results.slice(0, 20);
}
