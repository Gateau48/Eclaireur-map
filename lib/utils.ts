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

/** Formate un Price (lib/schema.ts) selon son type — jamais une valeur nue :
 *  le type conditionne la formulation ("À partir de...", une fourchette...). */
export function formatPrice(price: {
  type: "starting_from" | "range" | "fixed" | "per_sqm";
  value?: number;
  min?: number;
  max?: number;
  currency: string;
}): string | null {
  const fmt = (v: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: price.currency,
      maximumFractionDigits: 0
    }).format(v);

  switch (price.type) {
    case "fixed":
      return price.value !== undefined ? fmt(price.value) : null;
    case "starting_from":
      return price.value !== undefined ? `À partir de ${fmt(price.value)}` : null;
    case "range":
      return price.min !== undefined && price.max !== undefined
        ? `${fmt(price.min)} – ${fmt(price.max)}`
        : null;
    case "per_sqm":
      return price.value !== undefined ? `${fmt(price.value)} / m²` : null;
    default:
      return null;
  }
}