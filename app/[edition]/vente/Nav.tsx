"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Nav({ editionName }: { editionName: string }) {
  const [scrolled, setScrolled] = useState(false);

  // État de scroll géré par un seul listener passif, pas un re-render par
  // pixel scrollé.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-30 transition-colors duration-300",
        scrolled ? "glass" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Éclaireur Map
        </Link>
        <a
          href="#debloquer"
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Débloquer {editionName}
        </a>
      </div>
    </nav>
  );
}
