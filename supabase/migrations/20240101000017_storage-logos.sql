-- ============================================================
-- 017 — Supabase Storage: bucket para logos dos tenants
-- ============================================================

-- Criar bucket público para logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logos', 'logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

-- RLS: qualquer um pode ler (público)
CREATE POLICY "Public read logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

-- RLS: usuário autenticado pode fazer upload no path do seu tenant
CREATE POLICY "Tenant upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
  );

-- RLS: usuário pode atualizar/deletar logo do seu tenant
CREATE POLICY "Tenant update logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
  );

CREATE POLICY "Tenant delete logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
  );
