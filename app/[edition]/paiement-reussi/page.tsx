import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getEditionConfig as getEdition } from "@/lib/editions-config";
import { AwaitingAccess } from "./AwaitingAccess";

export default async function PaiementReussiPage({ params }: { params: { edition: string } }) {
  const edition = getEdition(params.edition);
  if (!edition) notFound();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/connexion?callbackUrl=/${params.edition}/paiement-reussi`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-24">
      <AwaitingAccess editionId={edition.id} editionName={edition.name} />
    </main>
  );
}
