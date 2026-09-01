import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Insensible à la casse ET aux accents — voir Partie 2.4 du brief. */
export function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** "2026-08-30T00:00:00.000Z" -> "Vérifié le 30 août 2026" — voir Partie 2.5. */
export function formatLastVerified(iso: string) {
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
  return `Vérifié le ${formatted}`;
}
