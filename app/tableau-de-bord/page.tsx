import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { supabase } from "@/lib/db/client";
import { getAllEditions } from "@/lib/editions";
import { EditionCard } from "./EditionCard";

export default async function TableauDeBordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/connexion");

  const { data: purchases } = await supabase
    .from("purchases")
    .select("edition_id")
    .eq("email", session.user.email)
    .eq("status", "active");

  const ownedEditionIds = (purchases ?? []).map((p) => p.edition_id);
  const editions = getAllEditions();

  return (
    <main>
      <h1 className="px-6 pt-12 text-3xl font-semibold">Vos éditions</h1>
      <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {editions.map((edition) => (
          <EditionCard
            key={edition.id}
            edition={edition}
            owned={ownedEditionIds.includes(edition.id)}
          />
        ))}
      </div>
    </main>
  );
}
