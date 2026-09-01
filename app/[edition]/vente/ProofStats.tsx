const STATS = [
  { value: "120+", label: "projets référencés" },
  { value: "3", label: "zones couvertes à Dakar" },
  { value: "1", label: "source minimum par point, toujours vérifiable" }
];

export function ProofStats() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 md:grid-cols-3">
      {STATS.map((stat) => (
        <div key={stat.label} className="text-center md:text-left">
          <div className="text-4xl font-semibold md:text-6xl">{stat.value}</div>
          <div className="mt-2 text-sm text-neutral-500">{stat.label}</div>
        </div>
      ))}
    </section>
  );
}
