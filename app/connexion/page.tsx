import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { SignInButton } from "./SignInButton";

export default async function ConnexionPage({
  searchParams
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await getServerSession(authOptions);
  const callbackUrl = searchParams.callbackUrl ?? "/tableau-de-bord";
  if (session) redirect(callbackUrl);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        Connectez-vous avec Google pour accéder à vos éditions débloquées.
      </p>
      <SignInButton callbackUrl={callbackUrl} />
    </main>
  );
}
