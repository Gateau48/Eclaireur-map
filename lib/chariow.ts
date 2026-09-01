import "server-only";

const CHARIOW_BASE_URL = "https://api.chariow.com/v1";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.CHARIOW_API_KEY}`,
    "Content-Type": "application/json"
  };
}

export interface ChariowAmount {
  value: number;
  formatted: string;
  short: string;
  currency: string;
}

export interface ChariowProduct {
  id: string;
  name: string;
  slug: string;
  type: "downloadable" | "service" | "course" | "license" | "bundle" | "coaching";
  is_free: boolean;
  pricing: {
    type: "free" | "one_time" | "what_you_want";
    current_price: ChariowAmount;
    price: ChariowAmount;
    sale_price: ChariowAmount | null;
    price_off: string | null;
  };
  // Date de fin de promo — on la réutilise comme date limite d'urgence sur
  // la page de vente (Partie 5.A du brief : "cette urgence de temps là").
  on_sale_until: string | null;
  sales_count: number | null;
}

/** GET /v1/products/{productId} — utilisé côté serveur pour afficher le
 *  vrai prix (et l'éventuelle date de fin de promo) sur la page de vente. */
export async function getChariowProduct(productId: string): Promise<ChariowProduct | null> {
  const res = await fetch(`${CHARIOW_BASE_URL}/products/${encodeURIComponent(productId)}`, {
    headers: authHeaders(),
    // Le prix peut changer côté Chariow ; on ne le fige pas en cache long.
    next: { revalidate: 60 }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as ChariowProduct;
}

export interface InitCheckoutParams {
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  phoneCountryCode: string;
  redirectUrl: string;
  editionId: string;
  customerIp?: string;
}

export interface InitCheckoutResult {
  step: "payment" | "completed" | "already_purchased";
  message: string | null;
  checkoutUrl: string | null;
}

/**
 * POST /v1/checkout — crée une session de paiement.
 * GARDE-FOU : n'appeler ceci qu'une fois l'utilisateur authentifié (email
 * de session Google) — voir app/api/checkout/init/route.ts, qui est le
 * seul point d'entrée légitime pour cette fonction (clé API secrète,
 * jamais exposée côté client).
 */
export async function initChariowCheckout(params: InitCheckoutParams): Promise<InitCheckoutResult> {
  const res = await fetch(`${CHARIOW_BASE_URL}/checkout`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      product_id: params.productId,
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      phone: {
        number: params.phoneNumber,
        country_code: params.phoneCountryCode
      },
      redirect_url: params.redirectUrl,
      // Revient dans le payload du Pulse `successful.sale` — c'est ce qui
      // permet de savoir quelle édition a été achetée (Partie 6.2 du brief).
      custom_metadata: { edition_id: params.editionId },
      customer_ip: params.customerIp
    })
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message ?? "Échec de l'initialisation du paiement Chariow");
  }

  return {
    step: json.data.step,
    message: json.data.message,
    checkoutUrl: json.data.payment?.checkout_url ?? null
  };
}
