import Link from "next/link";
import Image from "next/image";
import type { EditionConfig } from "@/lib/editions-config";

export function EditionCard({ edition, owned }: { edition: EditionConfig; owned: boolean }) {
  const href = owned ? `/${edition.id}` : `/${edition.id}/vente`;

  return (
    <Link
      href={href}
      className="group relative block aspect-[4/3] overflow-hidden rounded-3xl shadow-md transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <Image
        src={edition.thumbnailUrl}
        alt={edition.name}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-4 left-4 text-lg font-semibold text-white">
        {edition.name}
      </div>
      {owned ? (
        <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-neutral-900">
          Débloqué
        </span>
      ) : (
        <span className="absolute right-4 top-4 rounded-full bg-neutral-900/90 px-3 py-1 text-xs font-medium text-white">
          Débloquer
        </span>
      )}
    </Link>
  );
}