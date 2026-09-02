"use client";

import { ShieldCheck, MapPin, Search } from "lucide-react";

export function ProductPreview() {
  const features = [
    {
      icon: MapPin,
      title: "Carte interactive",
      description: "Chaque projet géolocalisé avec statut et sources vérifiées."
    },
    {
      icon: Search,
      title: "Recherche instantanée",
      description: "Trouvez un projet ou un promoteur en quelques secondes."
    },
    {
      icon: ShieldCheck,
      title: "Sources vérifiables",
      description: "Chaque statut est étayé par au moins une source officielle ou publique."
    }
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">
        Ce que vous débloquez
      </h2>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="glass rounded-3xl p-6 text-center">
            <f.icon className="mx-auto h-8 w-8 text-teal-600 dark:text-teal-400" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-neutral-500">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
