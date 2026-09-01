const steps = [
  {
    number: '01',
    title: 'Explorez la carte',
    description: 'Naviguez sur la carte interactive et découvrez les points géolocalisés par zone.',
  },
  {
    number: '02',
    title: 'Cliquez sur un point',
    description: 'Accédez au détail complet : statut, résumé, sources officielles et dates de vérification.',
  },
  {
    number: '03',
    title: 'Investissez en confiance',
    description: 'Prenez des décisions éclairées grâce à des données vérifiées et sourcées.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-semibold text-center mb-16">
        Comment ça marche
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {steps.map((step) => (
          <div key={step.number}>
            <div className="text-sm font-mono opacity-40 mb-3">{step.number}</div>
            <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
            <p className="text-neutral-500 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
