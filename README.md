# 🔮 SGT — Sistema de Gestão Terapêutica

Sistema de gestão para atendimentos terapêuticos com avaliação energética por radiestesia, gerenciamento de clientes e geração automática de relatórios.

## Stack

- React 19 + TypeScript 6 + Vite 8
- Supabase (PostgreSQL + Auth + RLS)
- TanStack Query 5 (cache e loading automático)
- React Router 7
- Lucide React (ícones)
- Deploy via GitHub Pages (PWA)

## Funcionalidades

- **Autenticação** — Login com email + senha, emails pré-autorizados
- **Clientes** — CRUD completo com busca e paginação
- **Atendimentos** — Registro completo com 10 seções:
  - Avaliação Energética (4 campos: mental, emocional, espiritual, físico)
  - Chakras (7, do coronário ao raiz)
  - Campo Áurico
  - Áreas da Vida (8 áreas fixas)
  - Emoções (lista)
  - Crenças Limitantes (lista)
  - Bloqueios (tipo, origem, intensidade)
  - Divórcios Energéticos
  - Tratamento (técnicas, gráficos, recomendações)
  - Relatório (editor + geração de PDF)
- **Auto-save** — Formulários salvam automaticamente com debounce
- **Dashboard** — Resumo com cards e últimos atendimentos
- **RBAC** — Controle de acesso por roles e permissões
- **PWA** — Instalável como app, responsivo
- **Soft delete** — Histórico nunca é perdido

## Setup

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Linke o CLI ao projeto:
   ```bash
   npx supabase link --project-ref <seu-project-ref>
   ```
3. Aplique as migrations:
   ```bash
   npm run db:push
   ```
4. No `supabase/seed.sql`, edite o email para o email da terapeuta

### 2. Rodar localmente

```bash
npm install
npm run db:start        # Sobe Supabase local (requer Docker rodando)
npm run db:status       # Mostra a URL e anon key local
cp .env.example .env
# Edite .env com os valores do db:status (ou use os padrões do Supabase local)
npm run dev
```

Acesse `http://localhost:5173/sistema-gestao-terapeutica/`

> **Nota:** O `supabase start` aplica automaticamente todas as migrations de `supabase/migrations/` e roda o `supabase/seed.sql`.

### 3. Primeiro acesso

1. Abra o sistema e clique em "Criar conta"
2. Use o email cadastrado no seed
3. Defina uma senha (mínimo 6 caracteres)
4. Pronto! Você será redirecionada ao Dashboard

### 4. Deploy no GitHub Pages

1. Crie um repositório no GitHub
2. Em **Settings > Secrets**, adicione `VITE_SUPABASE_ANON_KEY`
3. Em **Settings > Pages**, configure Source como "GitHub Actions"
4. Faça push para a branch `main`
5. O deploy acontece automaticamente

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_ANON_KEY` | Anon Key do projeto Supabase (a URL é extraída automaticamente do JWT) |

## Estrutura

```
src/
├── components/
│   ├── ui/            — Componentes reutilizáveis
│   ├── auth/          — Tela de login
│   ├── dashboard/     — Dashboard com resumo
│   ├── clients/       — CRUD de clientes
│   └── attendances/   — Atendimento + 10 abas
├── hooks/             — useAuth, usePermissions, useModal, useFocusTrap
├── services/          — Acesso ao Supabase (auth, clients, attendances)
├── lib/               — Supabase client, toast, confirm
├── types/             — TypeScript types + labels
├── styles/            — CSS modular (tema violeta/dourado)
└── App.tsx            — Router + Layout + Code Splitting
```

## Banco de dados

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários autorizados (email + role) |
| `roles` | Roles (admin, client) |
| `permissions` | Permissões (resource × action) |
| `role_permissions` | N:N roles ↔ permissions |
| `clients` | Clientes da terapeuta |
| `attendances` | Atendimentos (1 por sessão) |
| `energy_assessments` | Avaliação dos 4 campos energéticos |
| `chakras` | Estado dos 7 chakras |
| `aura_fields` | Análise do campo áurico |
| `life_areas` | Nota das 8 áreas da vida |
| `emotions` | Lista de emoções encontradas |
| `limiting_beliefs` | Crenças limitantes |
| `blockages` | Bloqueios energéticos |
| `energy_divorces` | Divórcios energéticos |
| `treatments` | Técnicas e recomendações |

## Scripts

### Desenvolvimento

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server local (Vite) |
| `npm run build` | Build de produção (TypeScript + Vite) |
| `npm run preview` | Preview do build local |
| `npm run lint` | Roda ESLint no projeto |
| `npm run commit` | Commit interativo (Commitizen) |

### Banco de dados (Supabase CLI)

| Comando | Descrição |
|---------|-----------|
| `npm run db:push` | Aplica migrations pendentes no banco remoto |
| `npm run db:reset` | Reseta o banco local e reaplica todas as migrations + seed |
| `npm run db:migration:new` | Cria um novo arquivo de migration vazio |
| `npm run db:migration:list` | Lista o status de todas as migrations |
| `npm run db:diff` | Gera uma migration a partir de mudanças feitas pelo Dashboard |

### Supabase local (Docker)

| Comando | Descrição |
|---------|-----------|
| `npm run db:start` | Sobe o Supabase completo local (Auth, Storage, Realtime, Studio) |
| `npm run db:stop` | Para todos os containers |
| `npm run db:status` | Mostra URLs e chaves do ambiente local |
| `npm run db:reset` | Reseta o banco local e reaplica todas as migrations + seed |
