'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PricingCTAProps {
  editionSlug: string;
}

export default function PricingCTA({ editionSlug }: PricingCTAProps) {
  const { data: session } = useSession();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.chariow.com/snap.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <section className="py-24 max-w-6xl mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-semibold mb-4">
        Débloquez l&apos;édition Dakar
      </h2>
      <p className="text-neutral-500 mb-8">
        Accédez à la carte complète avec tous les points géolocalisés et leurs sources.
      </p>
      <div
        id="chariow-widget"
        data-product-id={editionSlug}
        data-email={session?.user?.email ?? ''}
        className="inline-block"
      />
    </section>
  );
}
