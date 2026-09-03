import { NextRequest, NextResponse } from "next/server";
import { getEditionData } from "@/lib/editions.server";
import { normalize } from "@/lib/utils";

export interface SearchApiResult {
  kind: "promoter" | "project";
  promoterId: string;
  promoterName: string;
  projectId?: string;
  name: string;
  district?: string;
  hasExactLocation?: boolean;
}

export async function GET(req: NextRequest, { params }: { params: { edition: string } }) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] satisfies SearchApiResult[] });

  const edition = await getEditionData(params.edition);
  if (!edition) return NextResponse.json({ results: [] satisfies SearchApiResult[] });

  const nq = normalize(q);
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
          district: project.location.district,
          hasExactLocation: project.location.precision === "exact"
        });
      }
    }
  }

  // Les correspondances sur le nom priment sur celles trouvées seulement
  // via le quartier.
  results.sort((a, b) => Number(normalize(b.name).startsWith(nq)) - Number(normalize(a.name).startsWith(nq)));

  return NextResponse.json({ results: results.slice(0, 20) });
}