import { notFound } from 'next/navigation';
import { getEditionBySlug } from '@/lib/data/types';
import { getEditionData } from '@/lib/data/loader';
import EditionPageClient from './EditionPageClient';
import type { Zone, Point } from '@/lib/data/types';

interface PageProps {
  params: Promise<{ edition: string }>;
}

export default async function EditionPage({ params }: PageProps) {
  const { edition } = await params;

  const editionConfig = getEditionBySlug(edition);
  if (!editionConfig) {
    notFound();
  }

  const zones = await getEditionData(edition);
  if (zones.length === 0) {
    notFound();
  }

  const allPoints: Point[] = zones.flatMap((z) => z.points);
  const mergedZone: Zone = {
    zone_id: edition,
    zone_name: editionConfig.name,
    zone_center: {
      lat: editionConfig.center[1],
      lng: editionConfig.center[0],
    },
    points: allPoints,
  };

  return (
    <EditionPageClient
      zoneData={mergedZone}
      zones={zones}
      center={editionConfig.center}
      zoom={editionConfig.zoom}
    />
  );
}
