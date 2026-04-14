-- Adiciona colunas para integração com Mercado Pago na tabela de assinaturas
ALTER TABLE organization_subscriptions 
ADD COLUMN IF NOT EXISTS mercado_pago_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS mercado_pago_customer_id TEXT,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Adiciona coluna para ID do plano do Mercado Pago na tabela de planos SaaS
ALTER TABLE saas_plans 
ADD COLUMN IF NOT EXISTS mercado_pago_plan_id TEXT;

-- Função para atualizar a assinatura via Webhook (Bypass RLS)
-- Esta função é definida com SECURITY DEFINER para que o webhook possa atualizar o banco
-- mesmo sem um usuário logado (usando as permissões do criador da função).
CREATE OR REPLACE FUNCTION handle_subscription_webhook_update(
  p_organization_id UUID,
  p_status TEXT,
  p_mercado_pago_subscription_id TEXT,
  p_mercado_pago_customer_id TEXT,
  p_next_payment_date TIMESTAMPTZ,
  p_mercado_pago_plan_id TEXT
)
RETURNS void AS $$
DECLARE
  v_plan_id UUID;
  v_mapped_status TEXT;
BEGIN
  -- 1. Encontrar o plano correspondente ao ID do Mercado Pago
  SELECT id INTO v_plan_id 
  FROM saas_plans 
  WHERE mercado_pago_plan_id = p_mercado_pago_plan_id;

  -- Se não encontrar o plano, podemos registrar o erro ou usar um padrão
  IF v_plan_id IS NULL THEN
    RAISE NOTICE 'Plano do Mercado Pago % não encontrado no banco local.', p_mercado_pago_plan_id;
  END IF;

  -- 2. Mapear status do Mercado Pago para o nosso sistema
  v_mapped_status := CASE 
    WHEN p_status = 'authorized' THEN 'active'
    WHEN p_status = 'pending' THEN 'pending'
    WHEN p_status = 'paused' THEN 'paused'
    WHEN p_status = 'cancelled' THEN 'cancelled'
    ELSE p_status
  END;

  -- 3. Upsert na tabela organization_subscriptions
  INSERT INTO organization_subscriptions (
    organization_id,
    plan_id,
    status,
    current_period_start,
    mercado_pago_subscription_id,
    mercado_pago_customer_id,
    next_payment_date,
    updated_at
  )
  VALUES (
    p_organization_id,
    v_plan_id,
    v_mapped_status,
    NOW(),
    p_mercado_pago_subscription_id,
    p_mercado_pago_customer_id,
    p_next_payment_date,
    NOW()
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    plan_id = COALESCE(v_plan_id, organization_subscriptions.plan_id),
    status = EXCLUDED.status,
    mercado_pago_subscription_id = EXCLUDED.mercado_pago_subscription_id,
    mercado_pago_customer_id = EXCLUDED.mercado_pago_customer_id,
    next_payment_date = EXCLUDED.next_payment_date,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
