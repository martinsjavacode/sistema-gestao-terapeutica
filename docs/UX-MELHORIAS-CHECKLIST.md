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

## Fase 4 — Sistema de Protocolos de Tratamento

> Inspirado no Practice Better: templates reutilizáveis de tratamento.

- [ ] Criar entidade `protocols` no banco (nome, descrição, etapas, técnicas)
- [ ] CRUD de Protocolos (criar, editar, duplicar, arquivar)
- [ ] Biblioteca de protocolos pré-definidos:
  - [ ] Limpeza de Chakras
  - [ ] Remoção de Crenças Limitantes
  - [ ] Harmonização do Campo Áurico
  - [ ] Tratamento de Divórcios Energéticos
- [ ] Vincular protocolo ao atendimento (selecionar protocolo → preenche campos automaticamente)
- [ ] Marcar progresso do protocolo ao longo das sessões
- [ ] Compartilhar protocolo entre terapeutas (futuro multi-user)

---

## Fase 5 — Snippets & Preenchimento Rápido

> Reduzir tempo de documentação com trechos reutilizáveis.

- [ ] Sistema de snippets: trechos de texto salvos por categoria
  - [ ] Bloqueios comuns (ex: "Bloqueio emocional de origem familiar, intensidade 8/10")
  - [ ] Técnicas frequentes (ex: "Aplicação de Reiki no chakra cardíaco por 15min")
  - [ ] Recomendações padrão (ex: "Meditação guiada diária por 10min durante 7 dias")
  - [ ] Emoções recorrentes
  - [ ] Crenças limitantes comuns
- [ ] Atalho de inserção rápida nos campos de texto (digitar `/` para buscar snippet)
- [ ] Autocomplete com sugestões baseadas no histórico
- [ ] Permitir criar snippet a partir de texto já digitado ("Salvar como snippet")

---

## Fase 6 — Automações Simples

> Reduzir trabalho manual repetitivo.

- [ ] Ao finalizar atendimento → gerar PDF do relatório automaticamente
- [ ] Ao finalizar atendimento → marcar como "concluído" e exibir resumo
- [ ] Lembrete visual: "Cliente X não atende há 30+ dias"
- [ ] Auto-preenchimento de campos recorrentes (dados do cliente que não mudam)
- [ ] Notificação de atendimentos incompletos (rascunhos abandonados)

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

## Fase 8 — Dashboard Avançado

> Transformar o Dashboard em centro de decisão.

- [ ] Cards de resumo:
  - [ ] Total de clientes ativos
  - [ ] Atendimentos este mês (com comparativo ao mês anterior)
  - [ ] Clientes que precisam de retorno (sem sessão há 30+ dias)
  - [ ] Atendimentos em rascunho (incompletos)
- [ ] Lista "Próximas ações" (atendimentos incompletos, clientes sem retorno)
- [ ] Gráficos:
  - [ ] Atendimentos por semana/mês (linha)
  - [ ] Distribuição de bloqueios por tipo (pizza/donut)
  - [ ] Chakras mais frequentemente desequilibrados (barra)
- [ ] Quick actions: "Novo Cliente", "Novo Atendimento", "Ver Rascunhos"

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

## Fase 10 — Polish & Detalhes

> Pequenos detalhes que elevam a experiência.

- [ ] Animações sutis em transições de página (fade/slide)
- [ ] Feedback tátil: toast confirmando ações (salvar, excluir, duplicar)
- [ ] Atalhos de teclado para power users (Ctrl+N = novo atendimento, etc.)
- [ ] Tema escuro (dark mode)
- [ ] Onboarding guiado para primeiro acesso (tooltip tour)
- [ ] Página de "O que há de novo" para comunicar atualizações

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

*Última atualização: 2026-07-18 13:00*
