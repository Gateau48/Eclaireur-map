const STEPS = [
  {
    title: "Ouvrez la carte de votre zone",
    body: "Chaque promoteur et chaque projet apparaît comme un point coloré : vert, jaune ou rouge."
  },
  {
    title: "Consultez le détail",
    body: "Statut, résumé, profil du promoteur et sources vérifiables — permis, presse, justice, réseaux sociaux."
  },
  {
    title: "Décidez en confiance",
    body: "Toutes les informations sont sourcées ; aucune affirmation n'apparaît sans preuve consultable."
  }
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Comment ça marche</h2>
      <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.title}>
            <h3 className="text-lg font-medium">{step.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
