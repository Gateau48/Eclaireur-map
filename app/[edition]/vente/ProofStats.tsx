const stats = [
  { value: '18', label: 'Points géolocalisés' },
  { value: '3', label: 'Zones couvertes' },
  { value: '40+', label: 'Sources vérifiées' },
];

export default function ProofStats() {
  return (
    <section className="py-24 max-w-6xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-4xl md:text-6xl font-semibold">{stat.value}</div>
            <div className="mt-2 text-neutral-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
