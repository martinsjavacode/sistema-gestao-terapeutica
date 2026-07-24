# 📅 Booking Online — Roadmap

Transformar a agenda do SGT em um sistema de agendamento self-service (estilo Calendly).

---

## Fase 1 — Booking Self-Service

> Objetivo: cliente agenda sozinho via link público, sem WhatsApp.

### 1.1 Configuração de Disponibilidade

- [ ] Criar tabela `availability_rules` (dia da semana, horário início/fim, duração padrão, intervalo entre sessões)
- [ ] Criar tabela `availability_overrides` (bloqueios/exceções por data específica — feriados, folgas)
- [ ] UI para a terapeuta configurar seus horários recorrentes
- [ ] UI para bloquear datas específicas
- [ ] Validar que novos appointments respeitam a disponibilidade configurada

### 1.2 Página Pública de Booking

- [ ] Rota pública `/agendar/:slug` (sem autenticação)
- [ ] Criar campo `slug` na tabela de tenants/users para link personalizado
- [ ] Tela de seleção de data (calendário mostrando dias com vagas)
- [ ] Tela de seleção de horário (slots disponíveis no dia escolhido)
- [ ] Formulário de dados do cliente (nome, email, telefone, observações)
- [ ] Cálculo de slots disponíveis (disponibilidade − agendamentos existentes − overrides)
- [ ] RLS: permitir acesso anônimo somente para leitura de slots
- [ ] Proteção contra abuso (rate limit ou captcha)
- [ ] Tela de confirmação pós-agendamento
- [ ] Responsivo (mobile-first — cliente agenda pelo celular)

### 1.3 Link Personalizado

- [ ] Terapeuta define seu slug (ex: `ana-silva`)
- [ ] Validação de unicidade do slug
- [ ] UI de configuração do link na área de settings
- [ ] Preview/cópia do link público

### 1.4 Notificação por Email

- [ ] Configurar envio de email (Supabase Edge Function + Resend/SendGrid)
- [ ] Email de confirmação para o cliente ao agendar
- [ ] Email de notificação para a terapeuta ao receber agendamento
- [ ] Email ao cancelar/reagendar (para ambos)
- [ ] Template de email com branding básico

### 1.5 Cancelamento/Reagendamento pelo Cliente

- [ ] Gerar token único por agendamento (link de gestão)
- [ ] Página pública `/agendamento/:token` para cliente ver/gerenciar
- [ ] Botão de cancelar com confirmação
- [ ] Botão de reagendar (volta ao fluxo de seleção de horário)
- [ ] Regra de prazo mínimo (ex: não cancelar com menos de 24h)
- [ ] Configuração do prazo mínimo pela terapeuta

---

## Fase 2 — Sync Google Calendar

> Objetivo: terapeuta vê tudo em um lugar só, evita conflitos com compromissos pessoais.

- [ ] Integração OAuth2 com Google (consent screen, tokens)
- [ ] Armazenamento seguro de refresh token
- [ ] Ao criar appointment no SGT → criar evento no Google Calendar
- [ ] Ao cancelar/reagendar no SGT → atualizar/remover evento no Google
- [ ] Importar eventos do Google como bloqueios de disponibilidade (sync bidirecional)
- [ ] Webhook/polling para detectar mudanças no Google Calendar
- [ ] UI de conectar/desconectar conta Google
- [ ] Tratar expiração de token e re-autenticação

---

## Fase 3 — Lembretes WhatsApp + Pagamento

> Objetivo: reduzir no-show e permitir cobrança antecipada.

### 3.1 Lembretes WhatsApp

- [ ] Integrar API de WhatsApp Business (ex: Twilio, Z-API, Evolution API)
- [ ] Lembrete automático 24h antes da sessão
- [ ] Lembrete automático 1h antes da sessão
- [ ] Configuração de horários de envio pela terapeuta
- [ ] Template de mensagem personalizável
- [ ] Opt-in do cliente (LGPD)

### 3.2 Pagamento Antecipado

- [ ] Integrar gateway (Mercado Pago ou Stripe)
- [ ] Configuração: valor por tipo de sessão
- [ ] Cobrança no momento do agendamento (ou link de pagamento por email)
- [ ] Confirmar appointment somente após pagamento
- [ ] Política de reembolso em caso de cancelamento
- [ ] Dashboard de pagamentos recebidos

---

## Notas Técnicas

- A lógica de conflito de horários já existe em `insertAppointment`
- A tabela `appointments` já suporta os status necessários
- A página pública precisa de RLS com acesso `anon` (Supabase anon key)
- Edge Functions do Supabase servem para emails e webhooks
- Considerar Cal.com como fallback se a complexidade da Fase 2/3 não justificar desenvolvimento próprio
