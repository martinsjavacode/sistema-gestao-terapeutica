-- ============================================================
-- 018 — Short links para relatórios públicos
-- ============================================================

CREATE TABLE short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  attendance_id uuid NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_short_links_code ON short_links(code);
CREATE INDEX idx_short_links_attendance ON short_links(attendance_id);

ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;

-- Leitura pública (qualquer um com o código pode acessar)
CREATE POLICY "Public read short_links" ON short_links
  FOR SELECT USING (true);

-- Insert/delete apenas pelo tenant dono
CREATE POLICY "Tenant insert short_links" ON short_links
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "Tenant delete short_links" ON short_links
  FOR DELETE USING (tenant_id = current_tenant_id());

GRANT SELECT ON short_links TO anon, authenticated;
GRANT INSERT, DELETE ON short_links TO authenticated;

-- ============================================================
-- Função para gerar código curto único (8 caracteres alfanuméricos)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS text AS $$
DECLARE
  v_code text;
  v_chars text := 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_i int;
BEGIN
  LOOP
    v_code := '';
    FOR v_i IN 1..8 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM short_links WHERE code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: criar short link para um atendimento
-- ============================================================

CREATE OR REPLACE FUNCTION create_short_link(p_attendance_id uuid)
RETURNS text AS $$
DECLARE
  v_code text;
  v_tenant_id uuid;
  v_existing text;
BEGIN
  -- Verificar se já existe short link para esse atendimento
  SELECT code INTO v_existing FROM short_links WHERE attendance_id = p_attendance_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Pegar tenant do atendimento
  SELECT tenant_id INTO v_tenant_id FROM attendances WHERE id = p_attendance_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Atendimento não encontrado';
  END IF;

  -- Gerar código
  v_code := generate_short_code();

  -- Inserir
  INSERT INTO short_links (code, attendance_id, tenant_id)
  VALUES (v_code, p_attendance_id, v_tenant_id);

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_short_link(uuid) TO authenticated;

-- ============================================================
-- RPC: resolver short link (retorna attendance_id)
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_short_link(p_code text)
RETURNS uuid AS $$
  SELECT attendance_id FROM short_links WHERE code = p_code;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION resolve_short_link(text) TO anon, authenticated;
