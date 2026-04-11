import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSubscriptionStatus } from '@/lib/mercadopago';

export async function POST(request: Request) {
  // Inicializa o admin do Supabase dentro do handler para evitar erros de build se as env vars estiverem ausentes
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    const { organizationId, subscriptionId } = await request.json();

    if (!organizationId || !subscriptionId) {
      return NextResponse.json({ error: 'Faltando organizationId ou subscriptionId' }, { status: 400 });
    }

    // 1. Verifica a propriedade no banco de dados (Segurança)
    const { data: sub, error: subError } = await supabaseAdmin
      .from('organization_subscriptions')
      .select('id, organization_id, mercado_pago_subscription_id')
      .eq('organization_id', organizationId)
      .eq('mercado_pago_subscription_id', subscriptionId)
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: 'Assinatura não vinculada a esta organização.' }, { status: 403 });
    }

    // 2. Chama a API do Mercado Pago para cancelar
    const success = await updateSubscriptionStatus(subscriptionId, 'cancelled');

    if (!success) {
      return NextResponse.json({ error: 'Erro ao cancelar assinatura no Mercado Pago.' }, { status: 500 });
    }

    // 3. Atualiza o status no banco de dados local imediatamente
    // Embora o webhook também faça isso, fazemos aqui para feedback instantâneo
    const { error: updateError } = await supabaseAdmin
      .from('organization_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId);

    if (updateError) {
      console.error('Error updating local DB after cancellation:', updateError);
    }

    return NextResponse.json({ success: true, message: 'Assinatura cancelada com sucesso.' });
  } catch (error: any) {
    console.error('Cancel Subscription API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
