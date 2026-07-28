# Fichas de Atendimento — Planejamento Detalhado

## Conceito

Ficha = template de formulário que define a estrutura de um atendimento. Cada ficha pertence a um tenant + tipo de terapia, e determina quais seções (e em qual ordem) aparecem na tela de atendimento.

---

## Modelo de Dados

### Tabela `session_templates`

```sql
id              uuid PK
tenant_id       uuid FK → tenants
name            text NOT NULL
description     text
therapy_type    text NOT NULL          -- FK para therapy_techniques
is_default      boolean DEFAULT false  -- ficha padrão da terapia (1 por terapia/tenant)
sections        jsonb NOT NULL         -- array de TemplateSection
active          boolean DEFAULT true
usage_count     integer DEFAULT 0
created_at      timestamptz
```

### Estrutura de `sections` (JSONB)

```ts
interface TemplateSection {
  id: string           // UUID gerado no frontend
  type: 'builtin' | 'custom'
  key: string | null   // SectionKey para builtin, null para custom
  label: string
  order: number
  // Só para custom:
  field_type?: 'text' | 'list' | 'rating' | 'checkbox'
  config?: {
    placeholder?: string
    max_rating?: number       // Para rating: 10 ou 100
    rating_label?: string     // Ex: "%" ou "/10"
    checkbox_label?: string   // Ex: "Realizado"
  }
}
```

### Tabela `custom_section_values`

```sql
id              uuid PK
attendance_id   uuid FK → attendances
template_id     uuid FK → session_templates
section_id      text NOT NULL       -- ID da seção custom
content         text DEFAULT ''     -- texto livre
items           jsonb               -- para list: ["item1", "item2"]
rating          numeric             -- para rating: 0-100
checked         boolean             -- para checkbox
created_at      timestamptz
updated_at      timestamptz
UNIQUE(attendance_id, section_id)
```

### Tabela `attendances`

```
template_id     uuid FK → session_templates (nullable)
```

- Se `template_id IS NULL` → usa a ficha default da terapia
- Se a ficha default não existir → fallback para todas as seções da terapia (comportamento legado)

---

## Tipos de Campo (Custom Sections)

| Tipo | UI | Armazenamento |
|------|----|---------------|
| `text` | TextAreaWithSnippets | `content` (text) |
| `list` | Input + lista de chips (adicionar/remover) | `items` (jsonb array) |
| `rating` | Slider ou input numérico (0-10 ou 0-100%) | `rating` (numeric) |
| `checkbox` | Toggle/checkbox com label | `checked` (boolean) |

---

## Fluxo: Configuração da Ficha (Tela de Fichas)

### Criação

1. Terapeuta acessa "Fichas" no menu
2. Clica "Nova ficha"
3. Preenche: nome, tipo de terapia, descrição
4. Seleciona seções builtin (pills toggle — chakras, aura, etc.)
5. Adiciona seções custom:
   - Nome do campo
   - Tipo: texto / lista / nota / checkbox
   - Configuração opcional (placeholder, escala da nota)
6. Ordena todas as seções (drag ou ↑↓)
7. Marca como "Ficha padrão" (toggle) — desmarca a anterior automaticamente
8. Salva

### Edição

- Mesmo formulário, campos preenchidos
- **Versionamento**: ao salvar, se existem atendimentos vinculados, o sistema cria uma snapshot (copia o `sections` atual para o atendimento em `attendance_template_snapshot`) OU simplesmente não atualiza atendimentos existentes (eles guardam o template_id e o conteúdo já foi salvo)

### Decisão de versionamento (simplificado)

Atendimentos **já preenchidos** não são afetados pela edição da ficha porque:
- Seções builtin têm dados em tabelas próprias (energy_assessments, chakras, etc.)
- Seções custom têm dados em `custom_section_values` referenciadas por `section_id`
- Se uma seção custom é removida da ficha, os dados antigos permanecem no banco (não são deletados)
- Ao reabrir um atendimento antigo, renderiza as seções baseado no snapshot salvo no momento da criação

**Implementação**: Adicionar coluna `template_snapshot jsonb` em `attendances`. Quando o atendimento é criado ou a ficha é vinculada, salva uma cópia do `sections` naquele momento. O accordion usa `template_snapshot` para renderizar (não busca da ficha atual).

---

## Fluxo: Atendimento via Booking

1. Booking cria `appointment` + `attendance`
2. Na criação do attendance, busca a **ficha padrão** (`is_default = true`) para o `therapy_type`
3. Salva `template_id` + copia `sections` para `template_snapshot`
4. Se não existe ficha padrão → `template_id = NULL`, `template_snapshot = NULL` → fallback legado

---

## Fluxo: Atendimento Manual

1. Terapeuta cria atendimento, escolhe terapia
2. Sistema pré-seleciona a ficha padrão da terapia
3. Terapeuta pode trocar para outra ficha antes de começar
4. Ao confirmar, `template_snapshot` é salvo

---

## Fluxo: Trocar Ficha no Atendimento

1. Terapeuta abre atendimento → vê seletor de ficha no topo
2. Troca para outra ficha
3. **Aviso**: "Dados já preenchidos em seções que não estão na nova ficha serão mantidos mas não visíveis. Deseja continuar?"
4. Se confirma: atualiza `template_id` + `template_snapshot`
5. Accordion re-renderiza com as novas seções
6. Dados de seções builtin existentes (chakras, etc.) continuam no banco — se a seção voltar, os dados reaparecem

---

## UI: Seletor de Ficha no Atendimento

```
┌─────────────────────────────────────────────────┐
│ 📋 Ficha: [Limpeza de Chakras ▾]               │
│                                                 │
│ Opções:                                         │
│   • Sessão Completa (padrão) ✓                 │
│   • Limpeza de Chakras                          │
│   • Corte Energético Completo                   │
│   • + Criar nova ficha                          │
└─────────────────────────────────────────────────┘
```

---

## UI: Seções Custom no Accordion

### Texto livre
```
┌─ Exercícios para casa ──────────────────────────┐
│ [TextAreaWithSnippets]                           │
│ Digite aqui... (/ para snippets)                 │
└──────────────────────────────────────────────────┘
```

### Lista de itens
```
┌─ Cristais utilizados ───────────────────────────┐
│ [+ Adicionar item]                               │
│ • Ametista                              [×]     │
│ • Quartzo Rosa                          [×]     │
│ • Turmalina Negra                       [×]     │
└──────────────────────────────────────────────────┘
```

### Nota (rating)
```
┌─ Nível de energia pós-sessão ───────────────────┐
│ [====○=====] 7/10                               │
└──────────────────────────────────────────────────┘
```

### Checkbox
```
┌─ Banho de ervas recomendado ────────────────────┐
│ [✓] Realizado                                   │
└──────────────────────────────────────────────────┘
```

---

## Alterações no Banco (migrations)

1. **session_templates**: adicionar `is_default boolean DEFAULT false`
2. **attendances**: adicionar `template_snapshot jsonb`
3. **custom_section_values**: adicionar `items jsonb`, `rating numeric`, `checked boolean`
4. **Trigger/constraint**: garantir apenas 1 `is_default = true` por `(tenant_id, therapy_type)`
5. **Atualizar `create_public_booking` RPC**: buscar e aplicar ficha padrão ao criar attendance

---

## Ordem de Implementação

### Fase 1 — Fundação
1. Migration: `is_default`, `template_snapshot`, novos campos em custom_section_values
2. Atualizar types e service (`templates.ts`)
3. Lógica de "ficha padrão" (set/unset is_default)

### Fase 2 — Configuração
4. Form de ficha: adicionar field_type picker para seções custom
5. Toggle "ficha padrão" no form
6. Constraint visual (só 1 padrão por terapia)

### Fase 3 — Atendimento
7. Seletor de ficha: usar `template_snapshot` para renderizar
8. Renderização dos 4 tipos de campo custom
9. Auto-save para cada tipo de campo
10. Confirmação ao trocar ficha

### Fase 4 — Booking
11. Atualizar `create_public_booking` para vincular ficha padrão
12. Atualizar criação manual de atendimento para pré-selecionar ficha padrão

---

## Questões em Aberto

- [ ] Quer um campo "cor" ou "ícone" nas fichas para diferenciação visual?
- [ ] As fichas devem ser compartilháveis entre terapeutas do mesmo tenant (plano enterprise)?
- [ ] Quer limite de fichas por plano (free = 3, pro = ilimitado)?
