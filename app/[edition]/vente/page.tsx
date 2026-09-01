import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getEdition } from "@/lib/editions";
import { getChariowProduct } from "@/lib/chariow";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { ProofStats } from "./ProofStats";
import { HowItWorks } from "./HowItWorks";
import { ProductPreview } from "./ProductPreview";
import { PricingCTA } from "./PricingCTA";
import { Footer } from "./Footer";

export default async function VentePage({ params }: { params: { edition: string } }) {
  const edition = getEdition(params.edition);
  if (!edition) notFound();

  const [session, product] = await Promise.all([
    getServerSession(authOptions),
    getChariowProduct(edition.chariowProductId)
  ]);

  return (
    <main>
      <Nav editionName={edition.name} />
      <Hero editionName={edition.name} />
      <ProofStats />
      <HowItWorks />
      <ProductPreview />
      <PricingCTA
        editionId={edition.id}
        editionName={edition.name}
        isAuthenticated={!!session?.user?.email}
        userName={session?.user?.name}
        currentPrice={product?.pricing.current_price ?? null}
        basePrice={product?.pricing.price ?? null}
        priceOff={product?.pricing.price_off ?? null}
        onSaleUntil={product?.on_sale_until ?? null}
      />
      <Footer />
    </main>
  );
}
