import { createClient } from "@supabase/supabase-js";

// GARDE-FOU : middleware.ts tourne en Edge Runtime, donc on utilise le
// client Supabase compatible fetch (@supabase/supabase-js), jamais un
// driver Postgres direct (pg, etc.) qui échouerait en Edge.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false }
  }
);

export type PurchaseStatus = "active" | "refunded";

export interface Purchase {
  id: string;
  email: string;
  edition_id: string;
  chariow_sale_id: string;
  status: PurchaseStatus;
  created_at: string;
}
