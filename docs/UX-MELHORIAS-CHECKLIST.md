# 🔮 SGT — Checklist de Melhorias de UX

Baseado na análise dos sistemas **SimplePractice** e **Practice Better**.

---

## ~~Fase 1 — Fundação Visual & Navegação~~ ✅ (2026-07-18)

> Ajustes estruturais que impactam toda a experiência.

- [x] Redesign da sidebar com ícones + labels colapsáveis
- [x] Implementar empty states ilustrativos com CTAs em todas as telas vazias
- [x] Padronizar modais para ações rápidas (novo cliente, novo atendimento)
- [x] Melhorar hierarquia visual do Dashboard (cards com números grandes → listas → ações)
- [x] Adicionar breadcrumbs para navegação contextual
- [x] Implementar skeleton loaders durante carregamento (substituir spinners genéricos)
- [x] Revisar espaçamento e tipografia para hierarquia mais clara

---

## ~~Fase 2 — Client Hub (Página Centralizada do Cliente)~~ ✅ (2026-07-18)

> Inspirado no Practice Better: uma visão 360° do cliente.

- [x] Criar página "Hub do Cliente" com seções:
  - [x] Card de resumo (nome, contato, total de atendimentos, data do último)
  - [x] Próximo atendimento agendado (se houver)
  - [x] Gráfico de evolução energética (4 campos ao longo do tempo)
  - [x] Últimos 3 atendimentos com status
  - [ ] Protocolos ativos (Fase 4)
  - [x] Notas rápidas / observações
- [x] Timeline de atendimentos com mini-cards clicáveis
- [x] Indicador visual de "tempo desde último atendimento"
- [x] Ação rápida: "Novo Atendimento" direto do hub

---

## ~~Fase 3 — Evolução Energética (Gráficos)~~ ✅ (2026-07-18)

> Visualizar progresso entre sessões — diferencial do SGT.

- [x] Gráfico de linha: evolução dos 4 campos energéticos (mental, emocional, espiritual, físico) ao longo dos atendimentos
- [x] Gráfico radar: estado dos 7 chakras na sessão atual vs. sessão anterior
- [x] Indicadores de tendência (↑ melhorou, ↓ piorou, → estável) nos cards de resumo
- [x] Comparativo visual: "Primeira sessão vs. Última sessão"
- [x] Mini-gráficos (sparklines) no Dashboard para clientes com múltiplas sessões

---

## ~~Fase 4 — Sistema de Protocolos de Tratamento~~ ✅ (2026-07-18)

> Inspirado no Practice Better: templates reutilizáveis de tratamento.

- [x] Criar entidade `protocols` no banco (nome, descrição, etapas, técnicas)
- [x] CRUD de Protocolos (criar, editar, duplicar, arquivar)
- [x] Biblioteca de protocolos pré-definidos:
  - [x] Limpeza de Chakras
  - [x] Remoção de Crenças Limitantes
  - [x] Harmonização do Campo Áurico
  - [x] Tratamento de Divórcios Energéticos
- [x] Vincular protocolo ao atendimento (selecionar protocolo → preenche campos automaticamente)
- [x] Marcar progresso do protocolo ao longo das sessões
- [ ] Compartilhar protocolo entre terapeutas (futuro multi-user)

---

## ~~Fase 5 — Snippets & Preenchimento Rápido~~ ✅ (2026-07-18)

> Reduzir tempo de documentação com trechos reutilizáveis.

- [x] Sistema de snippets: trechos de texto salvos por categoria
  - [x] Bloqueios comuns (ex: "Bloqueio emocional de origem familiar, intensidade 8/10")
  - [x] Técnicas frequentes (ex: "Aplicação de Reiki no chakra cardíaco por 15min")
  - [x] Recomendações padrão (ex: "Meditação guiada diária por 10min durante 7 dias")
  - [x] Emoções recorrentes
  - [x] Crenças limitantes comuns
- [x] Atalho de inserção rápida nos campos de texto (digitar `/` para buscar snippet)
- [x] Autocomplete com sugestões baseadas no histórico
- [x] Permitir criar snippet a partir de texto já digitado ("Salvar como snippet")

---

## ~~Fase 6 — Automações Simples~~ ✅ (2026-07-18)

> Reduzir trabalho manual repetitivo.

- [x] Ao finalizar atendimento → gerar PDF do relatório automaticamente
- [x] Ao finalizar atendimento → marcar como "concluído" e exibir resumo
- [x] Lembrete visual: "Cliente X não atende há 30+ dias"
- [x] Auto-preenchimento de campos recorrentes (dados do cliente que não mudam)
- [x] Notificação de atendimentos incompletos (rascunhos abandonados)

---

## ~~Fase 7 — Melhorias no Formulário de Atendimento~~ ✅ (2026-07-18)

> Otimizar o fluxo das 10 seções.

- [x] Barra de progresso visual mostrando seções preenchidas vs. pendentes
- [x] Navegação entre seções via mini-map lateral (indicador de quais estão completas)
- [x] Salvar estado "em andamento" vs. "finalizado" com indicador visual claro
- [x] Permitir pular seções e preencher em qualquer ordem
- [x] Resumo final antes de concluir (preview do que foi preenchido)
- [x] Ação "Duplicar último atendimento" (para sessões de continuidade)
- [x] Templates de atendimento por tipo de sessão (primeira consulta, retorno, emergencial)

---

## ~~Fase 8 — Dashboard Avançado~~ ✅ (2026-07-18)

> Transformar o Dashboard em centro de decisão.

- [x] Cards de resumo:
  - [x] Total de clientes ativos
  - [x] Atendimentos este mês (com comparativo ao mês anterior)
  - [x] Clientes que precisam de retorno (sem sessão há 30+ dias)
  - [x] Atendimentos em rascunho (incompletos)
- [x] Lista "Próximas ações" (atendimentos incompletos, clientes sem retorno)
- [x] Gráficos:
  - [x] Atendimentos por semana/mês (linha)
  - [x] Distribuição de bloqueios por tipo (pizza/donut)
  - [x] Chakras mais frequentemente desequilibrados (barra)
- [x] Quick actions: "Novo Cliente", "Novo Atendimento", "Ver Rascunhos"

---

## Fase 9 — PWA & Mobile Experience

> Otimizar a experiência mobile (já é PWA).

- [ ] Revisar layout de todas as telas para mobile-first
- [ ] Simplificar navegação mobile (bottom tabs em vez de sidebar)
- [ ] Formulário de atendimento: uma seção por tela no mobile
- [ ] Gestos de swipe entre seções do atendimento
- [ ] Modo offline: salvar rascunho localmente e sincronizar quando online
- [ ] Push notifications para lembretes (atendimentos incompletos, retornos)

---

## ~~Fase 10 — Polish & Detalhes~~ ✅ (2026-07-18)

> Pequenos detalhes que elevam a experiência.

- [x] Animações sutis em transições de página (fade/slide)
- [x] Feedback tátil: toast confirmando ações (salvar, excluir, duplicar)
- [x] Atalhos de teclado para power users (Ctrl+N = novo atendimento, etc.)
- [x] Tema escuro (dark mode)
- [x] Onboarding guiado para primeiro acesso (tooltip tour)
- [x] Página de "O que há de novo" para comunicar atualizações

---

## Prioridade Sugerida

| Fase | Impacto | Esforço | Prioridade |
|------|---------|---------|------------|
| 1 — Fundação Visual | 🔴 Alto | 🟡 Médio | ⭐ Primeira |
| 2 — Client Hub | 🔴 Alto | 🟡 Médio | ⭐ Segunda |
| 3 — Evolução Energética | 🔴 Alto | 🟡 Médio | ⭐ Terceira |
| 7 — Formulário de Atendimento | 🔴 Alto | 🟢 Baixo | ⭐ Quarta |
| 5 — Snippets | 🟡 Médio | 🟡 Médio | Quinta |
| 8 — Dashboard Avançado | 🟡 Médio | 🟡 Médio | Sexta |
| 4 — Protocolos | 🟡 Médio | 🔴 Alto | Sétima |
| 6 — Automações | 🟡 Médio | 🟡 Médio | Oitava |
| 9 — Mobile | 🟢 Baixo | 🔴 Alto | Nona |
| 10 — Polish | 🟢 Baixo | 🟢 Baixo | Décima |

---

## Referências

- [SimplePractice](https://simplepractice.com) — UX patterns de calendário, modais, empty states
- [Practice Better](https://practicebetter.io) — Protocolos, charting, client hub, journaling
- [SaaS UI Design Patterns](https://saasui.design/application/simplepractice) — Screenshots de referência

---

*Última atualização: 2026-07-18 17:15*
