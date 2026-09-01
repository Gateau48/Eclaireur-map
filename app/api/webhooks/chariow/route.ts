import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySignature } from '@/lib/license/verifySignature';

export async function POST(req: Request) {
  const signature = req.headers.get('x-chariow-signature');
  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature, process.env.CHARIOW_WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const event = JSON.parse(rawBody);

  if (event.type === 'sale.completed') {
    await supabase.from('purchases').upsert(
      {
        email: event.data.customer.email,
        edition_id: event.data.custom_metadata.edition_id,
        chariow_sale_id: event.data.sale.id,
        status: 'active',
      },
      { onConflict: 'chariow_sale_id' }
    );
  }

  if (event.type === 'sale.refunded') {
    await supabase
      .from('purchases')
      .update({ status: 'refunded' })
      .eq('chariow_sale_id', event.data.sale.id);
  }

  return new Response('OK', { status: 200 });
}
