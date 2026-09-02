"use client";

import { signIn } from "next-auth/react";
import { GoogleIcon } from "./GoogleIcon";

export function SignInButton({ callbackUrl = "/tableau-de-bord" }: { callbackUrl?: string }) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      <GoogleIcon className="h-5 w-5" />
      Continuer avec Google
    </button>
  );
}