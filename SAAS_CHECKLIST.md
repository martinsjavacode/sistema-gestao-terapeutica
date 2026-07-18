# 🚀 Checklist: SGT → SaaS Multitenant

## Fase 1 — Multitenancy no Banco de Dados ✅

- [x] **1.1** Criar migration com tabela `tenants` + `plans`
  - `tenants`: id, name, slug, owner_email, plan_id, logo_url, trial_ends_at, active, created_at
  - `plans`: id, name, max_users, max_clients, max_attendances_month, features (jsonb), price_cents
  - Seed: free (30 clientes/R$0), pro (200 clientes/R$49.90), enterprise (1000 clientes/R$149.90)

- [x] **1.2** Adicionar `tenant_id` em clients, attendances, appointments, users
  - FK + ON DELETE CASCADE em todas as tabelas de domínio
  - Índices compostos (tenant_id + campos de busca)

- [x] **1.3** Reescrever RLS policies com isolamento por tenant
  - Função `current_tenant_id()` (extrai tenant do JWT/users)
  - Policies: `tenant_id = current_tenant_id() AND has_permission(...)`
  - Tabelas filhas: subquery EXISTS no attendance pai

- [x] **1.4** Criar triggers de enforcement de limites por plano
  - `check_client_limit` — BEFORE INSERT em clients
  - `check_user_limit` — BEFORE INSERT em users
  - `check_attendance_limit` — BEFORE INSERT em attendances (limite mensal)
  - `check_tenant_active` — bloqueia INSERT em tenant desativado

---

## Fase 2 — Auth e Onboarding ✅

- [x] **2.1** Criar função de provisioning (signup → tenant + user admin)
  - `generate_slug()` — normaliza nome para URL-friendly com unicidade
  - `provision_tenant(p_tenant_name, p_owner_name)` — cria tenant + user admin
  - Extensão `unaccent` habilitada

- [x] **2.2** Refatorar frontend Auth para signup público
  - Removida restrição de email pré-autorizado
  - 3 modos: login, signup (com nome do consultório), onboarding
  - Após signup: chama `provision_tenant` via RPC
  - Login detecta user sem tenant → redireciona para onboarding

- [x] **2.3** Implementar convite de colaboradores
  - Tabela `invites` (tenant_id, email, role_id, invited_by, accepted_at, expired_at)
  - `accept_invite()` — cria user vinculado ao tenant do convite
  - `check_pending_invite()` — detecta convite pendente no onboarding
  - UI no Settings: convidar por email + role, revogar convite

---

## Fase 3 — Ajustes no Frontend ✅

- [x] **3.1** Criar TenantContext e adaptar layout
  - `useTenant()` — context global (tenant name/slug/plan, PlanLimits com features)
  - `TenantProvider` envolve área autenticada no App.tsx
  - Sidebar exibe nome do consultório abaixo do "🔮 SGT"

- [x] **3.2** Separar Settings — Conta vs Consultório
  - Aba "Minha Conta": editar display_name, alterar senha
  - Aba "Consultório": nome editável, cards plano/slug/limites, equipe, convites

- [x] **3.3** Adaptar relatório público com branding do tenant
  - `get_public_report` retorna objeto `tenant` (name, slug, logo_url) via JOIN
  - Header do PublicReport exibe logo + nome do consultório

---

## Fase 4 — Planos e Billing

- [ ] **4.1** Implementar página de planos e pricing
  - Comparação de planos (free, pro, enterprise)
  - Trial de X dias no plano pro
  - Degradação graciosa ao expirar (read-only, não perde dados)

- [ ] **4.2** Integrar gateway de pagamento (Stripe ou Pagar.me)
  - Checkout para upgrade
  - Webhooks para atualizar plano do tenant
  - Portal de cobrança (histórico de faturas, cancelamento)

---

## Fase 5 — Landing Page e Deploy

- [ ] **5.1** Criar landing page (marketing + pricing)
  - Hero section, features, depoimentos, pricing cards
  - CTA para signup
  - SEO básico

- [ ] **5.2** Configurar deploy em domínio próprio
  - Migrar de GitHub Pages para Vercel/Netlify
  - Domínio custom + SSL
  - Separar app (`app.dominio.com.br`) de landing (`dominio.com.br`)

---

## Fase 6 — Features SaaS complementares

- [ ] **6.1** Super-admin panel
  - Dashboard com todos os tenants, métricas globais
  - Ações de suporte: ativar/desativar tenant, alterar plano manualmente
  - Logs de uso por tenant

- [ ] **6.2** Notificações (WhatsApp/email)
  - Lembrete de agendamento (24h antes)
  - Confirmação de consulta via WhatsApp
  - Email transacional: convites, reset de senha, boas-vindas

- [ ] **6.3** Auditoria e export LGPD
  - Tabela `audit_logs` (user_id, action, resource, details, timestamp)
  - Endpoint de export completo dos dados do tenant (JSON/CSV)
  - Exclusão de conta com purge de dados (direito ao esquecimento)

---

## Migrations Criadas

| Arquivo | Descrição |
|---------|-----------|
| `20240101000010_tenants-and-plans.sql` | Tabelas `plans` + `tenants` com seed de 3 planos |
| `20240101000011_add-tenant-id.sql` | `tenant_id` em users, clients, attendances, appointments |
| `20240101000012_rls-tenant-isolation.sql` | `current_tenant_id()` + todas as policies reescritas |
| `20240101000013_plan-limit-triggers.sql` | Triggers de limite (clientes, users, atendimentos/mês, tenant ativo) |
| `20240101000014_provision-tenant.sql` | `generate_slug()` + `provision_tenant()` |
| `20240101000015_invites.sql` | Tabela invites + `accept_invite()` + `check_pending_invite()` |
| `20240101000016_report-tenant-branding.sql` | `get_public_report` com JOIN em tenants |

## Arquivos Frontend Modificados

- `src/App.tsx` — TenantProvider + remoção de unauthorized
- `src/components/auth/Auth.tsx` — Signup público + onboarding + aceitar convite
- `src/components/ui/Sidebar.tsx` — Nome do consultório no header
- `src/components/settings/SettingsPage.tsx` — Abas Conta/Consultório
- `src/components/report/PublicReport.tsx` — Branding do tenant no header
- `src/hooks/useAuth.ts` — Expõe AppUser + needsOnboarding
- `src/hooks/useTenant.ts` — TenantProvider + useTenant (NOVO)
- `src/hooks/index.ts` — Exporta useTenant + TenantProvider
- `src/services/auth.ts` — Interface AppUser com tenant_id

---

## Notas Técnicas

### Estratégia de isolamento
- **Coluna `tenant_id`** em todas as tabelas de domínio (row-level isolation)
- RLS garante que nenhuma query cruza dados entre tenants
- Supabase Auth continua como provider de identidade

### Stack mantida
- React 19 + TypeScript + Vite (frontend)
- Supabase PostgreSQL + Auth + RLS (backend)
- TanStack Query (cache)
- Deploy estático (Vercel/Netlify para SaaS)
