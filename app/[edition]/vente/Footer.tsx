export function Footer() {
  return (
    <footer className="border-t border-black/10 px-6 py-10 text-center text-xs text-neutral-500 dark:border-white/10">
      © {new Date().getFullYear()} Éclaireur Map. Toutes les informations affichées sont sourcées et vérifiables.
    </footer>
  );
}
