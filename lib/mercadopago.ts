import crypto from 'crypto';

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

export interface MPSubscription {
  id: string;
  payer_id: number;
  payer_email: string;
  back_url: string;
  collector_id: number;
  application_id: number;
  status: 'authorized' | 'paused' | 'cancelled' | 'pending';
  reason: string;
  external_reference: string;
  date_created: string;
  last_modified: string;
  preapproval_plan_id: string;
  auto_recurring: {
    frequency: number;
    frequency_type: string;
    transaction_amount: number;
    currency_id: string;
    free_trial: any;
  };
  summarized: {
    quotas: number;
    charged_quantity: number;
    pending_charge_quantity: number;
    charged_amount: number;
    pending_charge_amount: number;
    last_charged_date: string;
    last_charged_amount: number;
    next_payment_date: string;
  };
  next_payment_date: string;
}

/**
 * Valida a assinatura do webhook do Mercado Pago conforme documentação:
 * https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function validateWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string
): boolean {
  if (!MP_WEBHOOK_SECRET || !xSignature) return false;

  const parts = xSignature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key.trim()] = value?.trim();
    return acc;
  }, {} as Record<string, string>);

  const ts = parts['ts'];
  const hash = parts['v1'];

  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const calculatedHash = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  return calculatedHash === hash;
}

/**
 * Busca os detalhes de uma assinatura (preapproval) no Mercado Pago
 */
export async function getSubscription(id: string): Promise<MPSubscription | null> {
  if (!MP_ACCESS_TOKEN) {
    console.error('MERCADO_PAGO_ACCESS_TOKEN não configurado.');
    return null;
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao buscar assinatura no Mercado Pago:', errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na requisição ao Mercado Pago:', error);
    return null;
  }
}

/**
 * Cancela ou pausa uma assinatura no Mercado Pago
 */
export async function updateSubscriptionStatus(
  id: string,
  status: 'cancelled' | 'paused' | 'authorized'
): Promise<boolean> {
  if (!MP_ACCESS_TOKEN) return false;

  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    return response.ok;
  } catch (error) {
    console.error('Erro ao atualizar status da assinatura no Mercado Pago:', error);
    return false;
  }
}
