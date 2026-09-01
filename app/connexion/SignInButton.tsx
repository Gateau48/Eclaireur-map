"use client";

import { signIn } from "next-auth/react";

export function SignInButton({ callbackUrl = "/tableau-de-bord" }: { callbackUrl?: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="mt-8 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
    >
      Continuer avec Google
    </button>
  );
}
