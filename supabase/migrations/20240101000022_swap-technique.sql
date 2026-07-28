-- ============================================================
-- 022 — Troca de técnica no plano Free (1x, carência 30 dias)
--
-- Regras:
-- 1. Apenas plano 'free' pode trocar (pro/enterprise podem adicionar)
-- 2. Carência de 30 dias desde activated_at
-- 3. Máximo 1 troca por slot (swapped_at preenchido = já trocou)
-- ============================================================

-- ============================================================
-- 1. Novos campos em tenant_techniques
-- ============================================================
ALTER TABLE tenant_techniques
  ADD COLUMN swapped_at timestamptz,
  ADD COLUMN original_technique_id text REFERENCES therapy_techniques(id);

COMMENT ON COLUMN tenant_techniques.swapped_at IS 'Data em que a técnica foi trocada. NULL = nunca trocou (pode trocar).';
COMMENT ON COLUMN tenant_techniques.original_technique_id IS 'ID da técnica original antes da troca. NULL = é a escolha original.';

-- ============================================================
-- 2. Função RPC para trocar técnica
-- ============================================================
CREATE OR REPLACE FUNCTION swap_technique(
  p_old_technique_id text,
  p_new_technique_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_plan_id text;
  v_record tenant_techniques%ROWTYPE;
  v_new_exists boolean;
BEGIN
  -- Obter tenant do usuário atual
  SELECT tenant_id INTO v_tenant_id
  FROM users
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não vinculado a um tenant';
  END IF;

  -- Verificar plano
  SELECT plan_id INTO v_plan_id
  FROM tenants
  WHERE id = v_tenant_id;

  IF v_plan_id != 'free' THEN
    RAISE EXCEPTION 'Troca de técnica só é permitida no plano Gratuito. No seu plano, você pode adicionar técnicas extras.';
  END IF;

  -- Buscar o registro da técnica atual
  SELECT * INTO v_record
  FROM tenant_techniques
  WHERE tenant_id = v_tenant_id
    AND technique_id = p_old_technique_id
    AND is_addon = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Técnica "%" não encontrada no seu plano', p_old_technique_id;
  END IF;

  -- Verificar se já trocou
  IF v_record.swapped_at IS NOT NULL THEN
    RAISE EXCEPTION 'Você já utilizou sua troca de técnica. Para acessar mais técnicas, faça upgrade do plano.';
  END IF;

  -- Verificar carência de 30 dias
  IF v_record.activated_at + interval '30 days' > now() THEN
    RAISE EXCEPTION 'Carência de 30 dias não atingida. Você poderá trocar a partir de %',
      to_char(v_record.activated_at + interval '30 days', 'DD/MM/YYYY');
  END IF;

  -- Verificar se a nova técnica existe e está ativa
  SELECT EXISTS(
    SELECT 1 FROM therapy_techniques WHERE id = p_new_technique_id AND active = true
  ) INTO v_new_exists;

  IF NOT v_new_exists THEN
    RAISE EXCEPTION 'Técnica "%" não encontrada ou inativa', p_new_technique_id;
  END IF;

  -- Verificar se já não tem a nova técnica
  IF EXISTS (
    SELECT 1 FROM tenant_techniques
    WHERE tenant_id = v_tenant_id AND technique_id = p_new_technique_id
  ) THEN
    RAISE EXCEPTION 'Você já possui a técnica "%"', p_new_technique_id;
  END IF;

  -- Executar a troca: atualizar o registro existente
  UPDATE tenant_techniques
  SET
    technique_id = p_new_technique_id,
    swapped_at = now(),
    original_technique_id = p_old_technique_id,
    activated_at = now()
  WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'old_technique', p_old_technique_id,
    'new_technique', p_new_technique_id,
    'swapped_at', now()
  );
END;
$$;

-- Permitir autenticados chamarem
GRANT EXECUTE ON FUNCTION swap_technique(text, text) TO authenticated;
