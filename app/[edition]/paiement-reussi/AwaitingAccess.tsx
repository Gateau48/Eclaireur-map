"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 16; // ~40 secondes

export function AwaitingAccess({ editionId, editionName }: { editionId: string; editionName: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"waiting" | "active" | "timeout">("waiting");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== "waiting") return;

    const check = async () => {
      try {
        const res = await fetch(`/api/access/${editionId}`, { cache: "no-store" });
        const data = await res.json();
        if (data.active) {
          setStatus("active");
          setTimeout(() => router.push(`/${editionId}`), 900);
          return;
        }
      } catch {
        // on réessaie simplement au prochain tick
      }
      setAttempt((a) => a + 1);
    };

    const t = setTimeout(check, POLL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [status, attempt, editionId, router]);

  useEffect(() => {
    if (attempt >= MAX_ATTEMPTS && status === "waiting") setStatus("timeout");
  }, [attempt, status]);

  return (
    <div className="glass mx-auto max-w-md rounded-4xl p-8 text-center">
      {status === "waiting" && (
        <>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-600" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">Paiement reçu</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Nous activons votre accès à {editionName}. Cela prend généralement quelques
            secondes — vous recevrez aussi un e-mail de confirmation de Chariow.
          </p>
        </>
      )}

      {status === "active" && (
        <>
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">Accès activé</h1>
          <p className="mt-2 text-sm text-neutral-500">Redirection vers la carte…</p>
        </>
      )}

      {status === "timeout" && (
        <>
          <h1 className="text-xl font-semibold">Presque prêt</h1>
          <p className="mt-2 text-sm text-neutral-500">
            L&rsquo;activation prend un peu plus de temps que prévu. Réessayez dans un instant,
            ou consultez votre e-mail de confirmation Chariow.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("waiting");
              setAttempt(0);
            }}
            className="mt-4 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
          >
            Réessayer
          </button>
        </>
      )}
    </div>
  );
}
