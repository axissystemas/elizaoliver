-- Administrative functions for SaaS management

-- Function to get all organizations with their profiles and subscriptions
CREATE OR REPLACE FUNCTION admin_get_all_organizations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_result jsonb;
BEGIN
  SELECT email INTO v_email FROM profiles WHERE id = auth.uid();
  IF v_email != 'suporte@axissystemas.com.br' THEN
    RAISE EXCEPTION 'Acesso negado. Apenas o Super Administrator pode usar esta função.';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'created_at', o.created_at,
      'profiles', COALESCE((
         SELECT jsonb_agg(
            jsonb_build_object('name', p.name, 'email', p.email, 'role', p.role)
         ) FROM profiles p WHERE p.organization_id = o.id
      ), '[]'::jsonb),
      'organization_subscriptions', COALESCE((
         SELECT jsonb_agg(
            jsonb_build_object(
               'plan_id', s.plan_id,
               'status', s.status,
               'current_period_start', s.current_period_start,
               'next_payment_date', s.next_payment_date
            )
         ) FROM organization_subscriptions s WHERE s.organization_id = o.id
      ), '[]'::jsonb)
    )
  ) INTO v_result
  FROM organizations o;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Function to manually force plan activation
CREATE OR REPLACE FUNCTION admin_force_plan_activation(p_org_id UUID, p_plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_exists BOOLEAN;
BEGIN
  SELECT email INTO v_email FROM profiles WHERE id = auth.uid();
  IF v_email != 'suporte@axissystemas.com.br' THEN
    RAISE EXCEPTION 'Acesso negado. Apenas o Super Administrator pode executar esta ação.';
  END IF;

  SELECT EXISTS(SELECT 1 FROM organization_subscriptions WHERE organization_id = p_org_id) INTO v_exists;

  IF v_exists THEN
    UPDATE organization_subscriptions SET 
      plan_id = p_plan_id,
      status = 'active',
      current_period_start = NOW(),
      updated_at = NOW(),
      mercado_pago_subscription_id = 'MANUAL_ACTIVATION_' || substr(md5(random()::text), 1, 9)
    WHERE organization_id = p_org_id;
  ELSE
    INSERT INTO organization_subscriptions (
      organization_id, plan_id, status, current_period_start, updated_at, mercado_pago_subscription_id
    ) VALUES (
      p_org_id, p_plan_id, 'active', NOW(), NOW(), 'MANUAL_ACTIVATION_' || substr(md5(random()::text), 1, 9)
    );
  END IF;
  
END;
$$;
