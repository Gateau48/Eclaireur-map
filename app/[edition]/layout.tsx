import { notFound } from 'next/navigation';
import { isValidEdition, getEditionBySlug } from '@/lib/data/types';

interface EditionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ edition: string }>;
}

export default async function EditionLayout({
  children,
  params,
}: EditionLayoutProps) {
  const { edition } = await params;

  if (!isValidEdition(edition)) {
    notFound();
  }

  const editionData = getEditionBySlug(edition);

  return (
    <div className="h-screen w-screen overflow-hidden">
      <title>{`L'Éclaireur Map — ${editionData?.name || edition}`}</title>
      {children}
    </div>
  );
}
