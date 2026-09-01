export default function Hero() {
  return (
    <section className="py-24 md:py-32 max-w-6xl mx-auto px-6 text-center">
      <h1 className="text-5xl md:text-7xl font-semibold tracking-tight">
        Vérifiez avant d&apos;investir à Dakar
      </h1>
      <p className="mt-4 text-lg md:text-xl text-neutral-500">
        La carte qui protège vos investissements immobiliers au Sénégal.
      </p>
      <button className="mt-8 px-8 py-4 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-2xl font-medium text-lg hover:opacity-90 transition-opacity min-h-[56px]">
        Débloquer l&apos;édition
      </button>
      <div className="mt-16 rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] overflow-hidden bg-neutral-100 dark:bg-neutral-800 aspect-video flex items-center justify-center">
        <span className="text-neutral-400 text-sm">Capture de la carte</span>
      </div>
    </section>
  );
}
