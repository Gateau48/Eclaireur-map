export function Hero({ editionName }: { editionName: string }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
      <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">
        Vérifiez avant d&rsquo;investir à {editionName}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-500 md:text-xl">
        La carte des projets immobiliers, zone par zone, avec statut et sources vérifiées.
      </p>
      <a
        href="#debloquer"
        className="mt-8 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Débloquer l&rsquo;édition
      </a>
      <div className="mt-16 overflow-hidden rounded-4xl shadow-hero">
        {/* Remplacer par une capture réelle de la carte, pas une image stock. */}
        <div className="aspect-[16/10] w-full bg-gradient-to-br from-sky-100 to-emerald-50 dark:from-neutral-900 dark:to-neutral-800" />
      </div>
    </section>
  );
}
