/**
 * Valide chaque fichier data/editions/*.json avec le schéma zod verrouillé
 * (lib/schema.ts) : sources manquantes, source_id orphelins, coordonnées
 * inventées pour une précision "exact" — tout est bloqué ici, avant que la
 * donnée n'atteigne Supabase.
 *   npm run validate-data
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { parseEditionData } from "../lib/schema";

const DATA_DIR = join(__dirname, "..", "data", "editions");

let hasError = false;

for (const file of readdirSync(DATA_DIR)) {
  if (!file.endsWith(".json")) continue;
  const raw = JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8"));
  try {
    const edition = parseEditionData(raw, file);
    const projectCount = edition.promoters.reduce((n, p) => n + p.projects.length, 0);
    console.log(`OK   ${file}  (${edition.promoters.length} promoteurs, ${projectCount} projets)`);
  } catch (err) {
    hasError = true;
    console.error(`FAIL ${file}`);
    console.error(err instanceof Error ? err.message : err);
  }
}

if (hasError) {
  process.exit(1);
}