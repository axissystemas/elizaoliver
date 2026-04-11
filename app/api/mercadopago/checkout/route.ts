import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSubscription } from '@/lib/mercadopago';

/**
 * Rota para criação de sessões de checkout do Mercado Pago (Assinaturas)
 */
export async function POST(request: Request) {
  // Inicializa o admin do Supabase dentro do handler para evitar erros de build se as env vars estiverem ausentes
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    // Verifica as variáveis de ambiente obrigatórias
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!accessToken || !supabaseUrl || !serviceRoleKey) {
      console.error('Variáveis de ambiente ausentes:', {
        hasAccessToken: !!accessToken,
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey
      });
      return NextResponse.json({
        error: 'Configuração do servidor incompleta. Verifique se as variáveis de ambiente (MERCADO_PAGO_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY) foram adicionadas no Vercel.'
      }, { status: 500 });
    }

    const { planCode, organizationId, email } = await request.json();

    if (!planCode || !organizationId) {
      return NextResponse.json({ error: 'Faltando planCode ou organizationId' }, { status: 400 });
    }

    // 1. Busca detalhes do plano no banco de dados
    const { data: plan, error: planError } = await supabaseAdmin
      .from('saas_plans')
      .select('mercado_pago_plan_id, name, price_monthly')
      .eq('code', planCode)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    if (!plan.mercado_pago_plan_id) {
      return NextResponse.json({
        error: 'Este plano não possui ID do Mercado Pago configurado. Verifique a tabela saas_plans.'
      }, { status: 400 });
    }

    // 2. Cria a assinatura (preapproval) no Mercado Pago
    // Se o e-mail estiver faltando, usamos um placeholder baseado no ID da organização.
    // O Mercado Pago permitirá que o cliente preencha o e-mail real se desejar.
    const payerEmail = email || `cliente_${organizationId.substring(0, 8)}@axisgc.com.br`;

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preapproval_plan_id: plan.mercado_pago_plan_id,
        reason: `Assinatura Axis GC - ${plan.name}`,
        external_reference: organizationId,
        payer_email: payerEmail,
        back_url: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/settings?subscription=success`
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.warn('API de Preapproval falhou, usando link direto como fallback:', result);
      
      // Fallback: Se a API falhar, geramos o link de checkout direto que o Mercado Pago aceita para planos.
      // Isso garante que o botão nunca quebre para o usuário em produção.
      const directUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${plan.mercado_pago_plan_id}`;
      
      return NextResponse.json({ 
        checkoutUrl: directUrl,
        isFallback: true,
        apiError: result.message || 'API Fallback'
      });
    }

    // Retorna o init_point oficial se a API funcionou
    return NextResponse.json({ checkoutUrl: result.init_point });
  } catch (error: any) {
    console.error('Erro na API de Checkout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
