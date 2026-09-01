export default function Footer() {
  return (
    <footer className="py-12 border-t border-neutral-200 dark:border-neutral-800">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-neutral-400">
          &copy; {new Date().getFullYear()} L&apos;Éclaireur Map. Tous droits réservés.
        </div>
        <div className="flex gap-6 text-sm text-neutral-400">
          <a href="#" className="hover:text-neutral-600 transition-colors">
            Conditions
          </a>
          <a href="#" className="hover:text-neutral-600 transition-colors">
            Confidentialité
          </a>
          <a href="#" className="hover:text-neutral-600 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
