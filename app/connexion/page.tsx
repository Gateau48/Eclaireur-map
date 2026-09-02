import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { MapPin } from "lucide-react";
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-white px-6 dark:from-neutral-900 dark:to-neutral-950">
      <div className="glass w-full max-w-sm rounded-4xl p-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
          <MapPin className="h-6 w-6" aria-hidden />
        </div>

        <h1 className="text-xl font-semibold tracking-tight">Connexion à Éclaireur Map</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Utilisez votre compte Google pour retrouver vos éditions débloquées, sur n&rsquo;importe
          quel appareil.
        </p>

        <div className="mt-6">
          <SignInButton callbackUrl={callbackUrl} />
        </div>

        <p className="mt-6 text-xs text-neutral-400">
          En continuant, vous acceptez que votre e-mail Google serve à identifier vos accès
          achetés.
        </p>
      </div>
    </main>
  );
}