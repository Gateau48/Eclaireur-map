import { notFound } from "next/navigation";
import { getEdition } from "@/lib/editions";
import { CarteClient } from "./CarteClient";

// GARDE-FOU : cette page n'est atteinte que si le middleware a confirmé
// l'accès (session + achat actif) — voir middleware.ts, Partie 6 du brief.
// /[edition]/vente reste la route publique, jamais protégée.
export default function CartePage({ params }: { params: { edition: string } }) {
  const edition = getEdition(params.edition);
  if (!edition) notFound();

  return <CarteClient edition={edition} />;
}
