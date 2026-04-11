import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookSignature, getSubscription } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabase';

/**
 * Endpoint de Webhook para o Mercado Pago v2
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const xSignature = req.headers.get('x-signature') || '';
    const xRequestId = req.headers.get('x-request-id') || '';

    // Log para fins de debug (desativar em produção)
    console.log('Webhook Mercado Pago recebido:', JSON.stringify(body, null, 2));

    const { type, data, action } = body;

    // Apenas nos interessamos por eventos de assinatura (preapproval)
    if (type !== 'subscription_preapproval') {
      return NextResponse.json({ message: 'Tipo de notificação irrelevante' }, { status: 200 });
    }

    const dataId = data?.id;
    if (!dataId) {
      return NextResponse.json({ error: 'Data ID não encontrado' }, { status: 400 });
    }

    // 1. Validar Assinatura (Segurança)
    const isValid = validateWebhookSignature(xSignature, xRequestId, dataId);
    if (!isValid) {
      console.warn('Assinatura de webhook inválida!', { xSignature, xRequestId, dataId });
      // Recomendado retornar 200 para evitar que o MP continue tentando se for um ataque
      // mas se você preferir 401 para rastrear no seu monitoramento, pode usar.
      return NextResponse.json({ error: 'Invalid signature' }, { status: 200 });
    }

    // 2. Buscar detalhes completos da assinatura na API do Mercado Pago
    const mpSubscription = await getSubscription(dataId);
    if (!mpSubscription) {
      return NextResponse.json({ error: 'Assinatura não encontrada na API' }, { status: 404 });
    }

    // 3. Extrair organização (external_reference deve ser o nosso organization_id)
    const organizationId = mpSubscription.external_reference;
    if (!organizationId) {
      console.error('Assinatura sem external_reference (organization_id):', dataId);
      return NextResponse.json({ error: 'External reference missing' }, { status: 200 });
    }

    // 4. Atualizar no banco de dados Supabase via RPC
    // Usamos o RPC SECURITY DEFINER para bypassar RLS sem precisar do Service Role Key no front/api
    const { error: rpcError } = await supabase.rpc('handle_subscription_webhook_update', {
      p_organization_id: organizationId,
      p_status: mpSubscription.status,
      p_mercado_pago_subscription_id: mpSubscription.id,
      p_mercado_pago_customer_id: mpSubscription.payer_id.toString(),
      p_next_payment_date: mpSubscription.next_payment_date,
      p_mercado_pago_plan_id: mpSubscription.preapproval_plan_id
    });

    if (rpcError) {
      console.error('Erro ao atualizar banco via RPC no webhook:', rpcError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Erro no processamento do webhook Mercado Pago:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
