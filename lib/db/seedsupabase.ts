/**
 * Pousse data/editions/*.json vers Supabase, après validation zod complète
 * (parseEditionData) — jamais de données non validées en base.
 *
 * Le JSON versionné dans le repo reste la source de vérité éditoriale :
 * ce script est rejouable (upsert) et peut être relancé à chaque mise à
 * jour de contenu, en CI ou manuellement.
 *
 *   npm run seed-supabase
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { parseEditionData, type Project, type Promoter } from "../schema";

const DATA_DIR = join(__dirname, "..", "..", "data", "editions");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return value;
}

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
);

function promoterRow(editionId: string, promoter: Promoter) {
  const { id, name, legal_name, photo_url, projects, ...rest } = promoter;
  return {
    id,
    edition_id: editionId,
    name,
    legal_name: legal_name ?? null,
    photo_url: photo_url ?? null,
    data: rest // { company?, public_information?, sources }
  };
}

function projectRow(editionId: string, promoterId: string, project: Project) {
  const { id, name, location, ...rest } = project;
  return {
    id,
    promoter_id: promoterId,
    edition_id: editionId,
    name,
    address: location.address ?? null,
    district: location.district ?? null,
    city: location.city,
    latitude: location.latitude,
    longitude: location.longitude,
    location_precision: location.precision,
    data: rest // { cover_image_url?, status?, pricing?, characteristics?, timeline?, public_information?, data_quality?, last_verified?, sources }
  };
}

async function main() {
  for (const file of readdirSync(DATA_DIR)) {
    if (!file.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8"));
    const edition = parseEditionData(raw, file); // GARDE-FOU : jamais de données non validées

    const promoterRows = edition.promoters.map((p) => promoterRow(edition.edition_id, p));
    const projectRows = edition.promoters.flatMap((p) =>
      p.projects.map((proj) => projectRow(edition.edition_id, p.id, proj))
    );

    // Promoteurs d'abord (les projets référencent promoter_id en clé étrangère).
    const { error: promoterError } = await supabase.from("promoters").upsert(promoterRows);
    if (promoterError) throw new Error(`Échec upsert promoters (${file}) : ${promoterError.message}`);

    const { error: projectError } = await supabase.from("projects").upsert(projectRows);
    if (projectError) throw new Error(`Échec upsert projects (${file}) : ${projectError.message}`);

    console.log(
      `OK   ${file} → ${promoterRows.length} promoteurs, ${projectRows.length} projets poussés vers Supabase`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});