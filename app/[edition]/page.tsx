import { notFound } from 'next/navigation';
import { getEditionBySlug } from '@/lib/data/types';
import { getEditionData } from '@/lib/data/loader';
import EditionPageClient from './EditionPageClient';

interface PageProps {
  params: Promise<{ edition: string }>;
}

export default async function EditionPage({ params }: PageProps) {
  const { edition } = await params;

  const editionConfig = getEditionBySlug(edition);
  if (!editionConfig) {
    notFound();
  }

  const zoneData = await getEditionData(edition);
  if (!zoneData) {
    notFound();
  }

  return (
    <EditionPageClient
      zoneData={zoneData}
      center={editionConfig.center}
      zoom={editionConfig.zoom}
    />
  );
}
