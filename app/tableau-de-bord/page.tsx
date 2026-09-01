import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/db/client';
import { EDITIONS } from '@/lib/data/types';
import EditionCard from '@/components/EditionCard';

export default async function TableauDeBordPage() {
  const session = await auth();
  if (!session) {
    redirect('/connexion');
  }

  const { data: purchases } = await supabase
    .from('purchases')
    .select('edition_id')
    .eq('email', session.user?.email ?? '')
    .eq('status', 'active');

  const ownedEditionIds = purchases?.map((p) => p.edition_id) ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <h1 className="text-3xl font-semibold px-6 pt-12">Vos éditions</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {EDITIONS.map((edition) => (
          <EditionCard
            key={edition.slug}
            edition={edition}
            owned={ownedEditionIds.includes(edition.slug)}
          />
        ))}
      </div>
    </div>
  );
}
