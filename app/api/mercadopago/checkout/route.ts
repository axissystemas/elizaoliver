import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMercadoPagoClient } from '@/lib/mercadopago';

// Initialize Supabase admin to check plan and get org info
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { planCode, organizationId, email } = await request.json();

    if (!planCode || !organizationId) {
      return NextResponse.json({ error: 'Faltando planCode ou organizationId' }, { status: 400 });
    }

    // 1. Get plan details from database
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

    // 2. Create subscription (preapproval) in Mercado Pago
    const mp = getMercadoPagoClient();
    
    // We create a preapproval session
    // Docs: https://www.mercadopago.com.br/developers/pt/reference/subscriptions/_preapproval/post
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
        payer_email: email,
        back_url: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/settings?subscription=success`,
        status: 'pending',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro Mercado Pago:', result);
      return NextResponse.json({ error: 'Erro ao criar assinatura no Mercado Pago', details: result }, { status: 500 });
    }

    // Return the init_point (checkout URL)
    return NextResponse.json({ checkoutUrl: result.init_point });
  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
