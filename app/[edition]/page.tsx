import { notFound } from "next/navigation";
import { getEdition } from "@/lib/editions";
import { getEditionData } from "@/lib/editions.server";
import { CarteClient } from "./CarteClient";

// GARDE-FOU : cette page n'est atteinte que si le middleware a confirmé
// l'accès (session + achat actif) — voir middleware.ts, Partie 6 du brief.
// /[edition]/vente reste la route publique, jamais protégée.
export default async function CartePage({ params }: { params: { edition: string } }) {
  const edition = getEdition(params.edition);
  if (!edition) notFound();

  const editionData = await getEditionData(params.edition);
  if (!editionData) notFound();

  return <CarteClient editionData={editionData} />;
}
