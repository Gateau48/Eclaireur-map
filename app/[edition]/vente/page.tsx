import { notFound } from 'next/navigation';
import { getEditionBySlug } from '@/lib/data/types';
import Nav from './Nav';
import Hero from './Hero';
import ProofStats from './ProofStats';
import HowItWorks from './HowItWorks';
import ProductPreview from './ProductPreview';
import PricingCTA from './PricingCTA';
import Footer from './Footer';

interface PageProps {
  params: Promise<{ edition: string }>;
}

export default async function VentePage({ params }: PageProps) {
  const { edition } = await params;

  const editionConfig = getEditionBySlug(edition);
  if (!editionConfig) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <ProofStats />
      <HowItWorks />
      <ProductPreview />
      <PricingCTA editionSlug={edition} />
      <Footer />
    </div>
  );
}
