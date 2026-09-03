import "server-only";
import { supabase } from "./db/client";
import { getEditionConfig } from "./editionsconfig";
import { parseEditionData, type EditionData, type Project, type Promoter } from "./schema";

// GARDE-FOU : import STATIQUE (pas de fs.readFileSync avec un chemin
// dynamique) — un chemin construit à l'exécution (`data/editions/${id}.json`)
// n'est pas toujours tracé correctement par le bundler de Next.js sur les
// runtimes serverless (Vercel), ce qui peut faire disparaître le fichier au
// déploiement. Un import statique, lui, est toujours inclus. Comme les
// éditions sont une petite liste connue à l'avance (voir editions-config),
// cette carte peut rester énumérée à la main.
import dakarFixture from "@/data/editions/Dakar.json";

const LOCAL_FIXTURES: Record<string, unknown> = {
  dakar: dakarFixture
};

function loadLocalFixture(editionId: string): EditionData | null {
  const raw = LOCAL_FIXTURES[editionId];
  if (!raw) return null;
  return parseEditionData(raw, `${editionId}.json (repli local)`);
}

interface PromoterRow {
  id: string;
  name: string;
  legal_name: string | null;
  photo_url: string | null;
  data: Partial<Promoter>; // { company?, public_information?, sources? }
}

interface ProjectRow {
  id: string;
  promoter_id: string;
  name: string;
  address: string | null;
  district: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  location_precision: "exact" | "approximate" | "district";
  data: Omit<Project, "id" | "name" | "location">;
}

function reassembleProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    location: {
      address: row.address ?? undefined,
      district: row.district ?? undefined,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      precision: row.location_precision
    },
    ...row.data
  };
}

function reassemblePromoter(row: PromoterRow, projects: Project[]): Promoter {
  return {
    id: row.id,
    name: row.name,
    legal_name: row.legal_name ?? undefined,
    photo_url: row.photo_url ?? undefined,
    ...row.data,
    sources: row.data.sources ?? [],
    projects
  };
}

async function fetchFromSupabase(editionId: string): Promise<EditionData | null> {
  const { data: promoterRows, error: promoterError } = await supabase
    .from("promoters")
    .select("id, name, legal_name, photo_url, data")
    .eq("edition_id", editionId);
  if (promoterError) throw promoterError;
  if (!promoterRows || promoterRows.length === 0) return null;

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select("id, promoter_id, name, address, district, city, latitude, longitude, location_precision, data")
    .eq("edition_id", editionId);
  if (projectError) throw projectError;

  const promoters = (promoterRows as PromoterRow[]).map((row) => {
    const ownProjects = ((projectRows ?? []) as ProjectRow[])
      .filter((p) => p.promoter_id === row.id)
      .map(reassembleProject);
    return reassemblePromoter(row, ownProjects);
  });

  const config = getEditionConfig(editionId);
  return { edition_id: editionId, edition_name: config?.name ?? editionId, promoters };
}

/**
 * Point d'entrée unique pour charger le contenu d'une édition (utilisé par
 * la page carte, la page de vente, et la recherche). Supabase en priorité
 * si configuré ; repli automatique et silencieux sur le JSON local sinon
 * ou en cas d'erreur réseau — utile en développement avant d'avoir
 * configuré Supabase, ou si Supabase est temporairement indisponible.
 */
export async function getEditionData(editionId: string): Promise<EditionData | null> {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseConfigured) {
    try {
      const fromSupabase = await fetchFromSupabase(editionId);
      if (fromSupabase) return fromSupabase;
    } catch (err) {
      console.error(`Supabase indisponible pour l'édition "${editionId}", repli local :`, err);
    }
  }

  return loadLocalFixture(editionId);
}