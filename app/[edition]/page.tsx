import { notFound } from "next/navigation";
import { getEdition } from "@/lib/data/editions";
import { CarteClient } from "@/components/CarteClient";

export default async function EditionPage({
  params
}: {
  params: { edition: string };
}) {
  const edition = getEdition(params.edition);
  if (!edition) notFound();

  return <CarteClient edition={edition} />;
}
