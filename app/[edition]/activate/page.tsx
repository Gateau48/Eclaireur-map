import { notFound } from 'next/navigation';
import { isValidEdition } from '@/lib/data/types';
import ActivateClient from './ActivateClient';

interface PageProps {
  params: Promise<{ edition: string }>;
}

export default async function ActivatePage({ params }: PageProps) {
  const { edition } = await params;

  if (!isValidEdition(edition)) {
    notFound();
  }

  return <ActivateClient edition={edition} />;
}
