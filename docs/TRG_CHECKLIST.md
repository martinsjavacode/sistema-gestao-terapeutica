# 🧠 Checklist — Implementação da TRG no SGT

Checklist de funcionalidades para suportar a **Terapia de Reprocessamento Generativo (TRG)** no Sistema de Gestão Terapêutica.

---

## Fase 0 — Infraestrutura Base

> Adaptações no sistema existente para suportar a TRG como nova modalidade.
>
> **Arquitetura atual:** O SGT usa um modelo modular de técnicas/seções (migrations 021-022).
> Técnicas são registradas em `therapy_techniques`, suas seções em `therapy_sections` +
> `technique_sections`, e ativadas por tenant via `tenant_techniques`.
> A TRG se integra a esse modelo como uma nova técnica com seções próprias.

- [x] ~~Adaptar o fluxo de atendimento para exibir seções específicas por tipo de terapia~~
  → Implementado via modelo modular: `therapy_techniques` + `therapy_sections` + `technique_sections`
- [x] ~~Garantir que RLS e tenant isolation se apliquem às novas tabelas~~
  → Padrão consolidado com `current_tenant_id()` (migration 012). Novas tabelas seguem o mesmo modelo.
- [x] ~~Condicionar exibição de seções pelo tipo de terapia~~
  → O frontend carrega seções dinamicamente via `useTenant → techniques`. Cada técnica exibe apenas suas seções configuradas.
- [x] ~~Migrar `attendances.therapy_type` de enum para FK em `therapy_techniques`~~
  → Migration 023: coluna convertida para `text` com FK. Enum `therapy_type` dropado.
  Frontend usa `getTherapyLabel(id, techniques?)` para resolver nomes dinamicamente.
- [ ] Inserir `'trg'` em `therapy_techniques` (name='TRG - Reprocessamento Generativo', active=true)
- [ ] Criar seções TRG em `therapy_sections`:
  - `trg-anamnesis` — Anamnese TRG
  - `trg-quality-of-life` — Questionário de Qualidade de Vida
  - `trg-chronological` — Protocolo Cronológico
  - `trg-somatic` — Protocolo Somático
  - `trg-thematic` — Protocolo Temático
  - `trg-future` — Protocolo Futuro
  - `trg-enhancement` — Protocolo de Potencialização
  - `trg-follow-up` — Acompanhamento Pós-Tratamento
  - `report` — Relatório (reutiliza seção existente)
- [ ] Mapear seções → técnica TRG em `technique_sections` com display_order
- [ ] Criar tipo enum `trg_protocol` (cronologico, somatico, tematico, futuro, potencializacao)
- [ ] Criar tabela `trg_treatments` (vínculo client ↔ protocolo geral do tratamento TRG)
  - id, client_id, tenant_id, start_date, end_date, status (em_andamento, concluido, abandonado)
  - total_sessions_planned, notes
- [ ] Criar tabela `trg_sessions` (cada sessão individual do tratamento)
  - id, trg_treatment_id, attendance_id, protocol (enum), session_number, date
  - status (agendada, realizada, cancelada)
- [ ] Atualizar `provision_tenant` para provisionar técnica TRG automaticamente (ou via seed)
- [ ] Criar componentes React para cada seção TRG (seguindo padrão dos tabs existentes com auto-save)

---

## Fase 1 — Anamnese TRG

> Coleta inicial de informações antes de iniciar o tratamento.

- [ ] Criar tabela `trg_anamnesis`
  - id, trg_treatment_id, tenant_id, created_at
  - chief_complaint (queixa principal)
  - emotional_history (histórico emocional relevante)
  - previous_therapies (terapias anteriores e resultados)
  - medications (medicações em uso)
  - sleep_quality (qualidade do sono: escala 0-6)
  - physical_symptoms (sintomas físicos atuais)
  - family_context (contexto familiar)
  - traumatic_events (eventos traumáticos conhecidos)
  - expectations (expectativas com o tratamento)
  - notes
- [ ] RLS: `tenant_id = current_tenant_id()`
- [ ] Componente `TrgAnamnesisTab` (segue padrão dos tabs com auto-save + debounce)
- [ ] Vincular anamnese ao tratamento TRG antes da primeira sessão

---

## Fase 2 — Questionário de Qualidade de Vida (Pré/Pós)

> Escala de percepção usada na TRG para medir evolução (0 a 6).

- [ ] Criar tabela `trg_quality_of_life`
  - id, trg_treatment_id, tenant_id, moment (enum: pre_treatment, post_treatment, follow_up)
  - date, applied_at
  - romantic_satisfaction (0-6)
  - sexual_satisfaction (0-6)
  - life_enjoyment (0-6)
  - physical_appearance_satisfaction (0-6)
  - professional_confidence (0-6)
  - feelings_about_past (0-6)
  - future_optimism (0-6)
  - self_esteem (0-6)
  - anxiety_level (0-6, invertido)
  - sleep_quality (0-6)
  - notes
- [ ] RLS: `tenant_id = current_tenant_id()`
- [ ] Componente `TrgQualityOfLifeTab` com escala visual (0 = péssimo, 6 = excelente)
- [ ] Gráfico comparativo pré × pós tratamento (radar chart ou barras agrupadas)
- [ ] Permitir múltiplas aplicações (follow-up semestral pós-alta)

---

## Fase 3 — Protocolo Cronológico

> Reprocessamento das fases da vida em ciclos de 5 em 5 anos (nascimento → presente).

- [ ] Criar tabela `trg_chronological`
  - id, trg_session_id, tenant_id
  - age_range_start, age_range_end (ex: 0-5, 6-10, 11-15...)
  - events_identified (texto livre — eventos identificados nessa faixa)
  - emotions_found (emoções associadas)
  - reprocessing_notes (observações do reprocessamento)
  - resolution_status (enum: pendente, parcial, resolvido)
  - notes
- [ ] RLS: `tenant_id = current_tenant_id()`
- [ ] Componente `TrgChronologicalTab` com timeline visual das faixas etárias
- [ ] Gerar faixas automaticamente com base na idade do cliente
- [ ] Permitir registrar múltiplos eventos por faixa etária
- [ ] Indicador visual de progresso (quais faixas já foram reprocessadas)

---

## Fase 4 — Protocolo Somático

> Mapeamento de sintomas psicossomáticos e sua origem emocional.

- [ ] Criar tabela `trg_somatic`
  - id, trg_session_id, tenant_id
  - body_region (região do corpo afetada)
  - symptom_description (descrição do sintoma)
  - emotional_origin (emoção/evento de origem identificado)
  - intensity_before (intensidade antes: 0-10)
  - intensity_after (intensidade depois: 0-10)
  - reprocessing_notes
  - resolution_status (pendente, parcial, resolvido)
- [ ] RLS: `tenant_id = current_tenant_id()`
- [ ] Componente `TrgSomaticTab` com mapa corporal interativo (ou lista de regiões)
- [ ] Registro de múltiplos sintomas por sessão
- [ ] Evolução da intensidade ao longo das sessões (gráfico de linha)

---

## Fase 5 — Protocolo Temático

> Temas específicos que geram desequilíbrio emocional.

- [ ] Criar tabela `trg_thematic`
  - id, trg_session_id, tenant_id
  - theme (tema principal: ex. "abandono", "rejeição", "abuso")
  - trigger_description (descrição do gatilho)
  - associated_events (eventos associados a esse tema)
  - emotional_response (resposta emocional atual)
  - reprocessing_notes
  - resolution_status (pendente, parcial, resolvido)
- [ ] RLS: `tenant_id = current_tenant_id()`
- [ ] Componente `TrgThematicTab` com lista de temas identificados e status
- [ ] Possibilidade de vincular temas a eventos do protocolo cronológico
- [ ] Tags/categorias para temas recorrentes

---

## Fase 6 — Protocolo Futuro

> Reprocessamento de medos e anseios em relação ao futuro.

- [ ] Criar tabela `trg_future`
  - id, trg_session_id, tenant_id
  - fear_description (descrição do medo/receio)
  - trigger (gatilho emocional associado)
  - desired_outcome (resultado desejado)
  - reprocessing_notes
  - intensity_before (0-10)
  - intensity_after (0-10)
  - resolution_status (pendente, parcial, resolvido)
- [ ] RLS: `tenant_id = current_tenant_id()`
- [ ] Componente `TrgFutureTab` com registro de receios e escala de intensidade
- [ ] Visualização do progresso (antes vs depois)

---

## Fase 7 — Protocolo de Potencialização

> Fortalecimento emocional e potencialização de recursos positivos.

- [ ] Criar tabela `trg_enhancement`
  - id, trg_session_id, tenant_id
  - positive_resource (recurso/emoção positiva identificada)
  - source_event (evento de origem da emoção positiva)
  - enhancement_notes (como foi potencializado)
  - confidence_level_before (0-10)
  - confidence_level_after (0-10)
  - goals_set (objetivos definidos para o futuro)
  - notes
- [ ] RLS: `tenant_id = current_tenant_id()`
- [ ] Componente `TrgEnhancementTab` com registro de recursos positivos
- [ ] Lista de conquistas e fortalezas emocionais identificadas ao longo do tratamento
- [ ] Mensagem/resumo motivacional para o paciente (opcional para relatório)

---

## Fase 8 — Acompanhamento Pós-Tratamento

> Follow-up semestral após alta da TRG.

- [ ] Criar tabela `trg_follow_ups`
  - id, trg_treatment_id, tenant_id, date, session_number_post
  - general_status (como o paciente se sente: escala 0-6)
  - symptoms_returned (boolean)
  - symptoms_description (quais sintomas retornaram, se aplicável)
  - medication_status (manteve, reduziu, suspendeu)
  - quality_of_life_id (FK para questionário reaplicado)
  - notes
- [ ] RLS: `tenant_id = current_tenant_id()`
- [ ] Componente `TrgFollowUpTab`
- [ ] Agendamento automático de follow-up (a cada 6 meses por 2+ anos)
- [ ] Notificação/lembrete para a terapeuta quando follow-up estiver próximo
- [ ] Dashboard de acompanhamento pós-alta por paciente

---

## Fase 9 — Relatório e Visualização

> Geração de relatórios e dashboards específicos da TRG.
>
> **Nota:** O SGT usa relatório via link público (rota `/r/:code`). O botão "Gerar PDF" foi removido.
> Relatórios TRG seguirão o mesmo padrão: link compartilhável com visualização completa.

- [ ] Template de relatório público para TRG (rota `/r/:code` com layout específico)
- [ ] Gráfico de evolução do questionário de qualidade de vida (pré → pós → follow-ups)
- [ ] Timeline visual do tratamento (sessões realizadas, protocolos concluídos)
- [ ] Resumo executivo do tratamento para o paciente
- [ ] Dashboard TRG com métricas:
  - Pacientes em tratamento ativo
  - Taxa de conclusão dos protocolos
  - Média de sessões até alta
  - Evolução média nos questionários de qualidade de vida
- [ ] Exportação dos dados para pesquisa (CSV anonimizado)

---

## Fase 10 — Melhorias e Integrações (Futuro)

> Nice-to-have para versões futuras.

- [ ] Módulo de consentimento informado (TCLE) digital com assinatura
- [ ] Questionários customizáveis (além dos 10 campos padrão)
- [ ] Integração com TRG Club (API, se disponível)
- [ ] Portal do paciente — acesso limitado para ver próprio progresso
- [ ] Biblioteca de exercícios de respiração diafragmática (orientações pré-sessão)
- [ ] Gravação de áudio da sessão (opcional, com consentimento)
- [ ] IA para sugestão de temas com base no protocolo cronológico
- [ ] Templates de relatório específicos para publicação científica (caso clínico)

---

## Resumo de Novas Tabelas

| Tabela | Descrição |
|--------|-----------|
| `trg_treatments` | Tratamento TRG completo (1 por paciente por ciclo) |
| `trg_sessions` | Sessões individuais vinculadas ao tratamento |
| `trg_anamnesis` | Anamnese inicial do tratamento |
| `trg_quality_of_life` | Questionário de qualidade de vida (pré/pós/follow-up) |
| `trg_chronological` | Registros do protocolo cronológico |
| `trg_somatic` | Registros do protocolo somático |
| `trg_thematic` | Registros do protocolo temático |
| `trg_future` | Registros do protocolo futuro |
| `trg_enhancement` | Registros do protocolo de potencialização |
| `trg_follow_ups` | Acompanhamento pós-tratamento |

---

## Compatibilidade com SGT Existente

- ✅ Reutiliza `clients` — sem alteração
- ✅ Reutiliza `attendances` — `therapy_type` agora é FK para `therapy_techniques(id)` (migration 023, enum removido)
- ✅ Reutiliza `appointments` — agendamento normal
- ✅ Reutiliza RBAC + tenant isolation (`current_tenant_id()`)
- ✅ Reutiliza auto-save com debounce (padrão dos tabs)
- ✅ Reutiliza relatório via link público (novo template TRG na rota `/r/:code`)
- ✅ Reutiliza `completed_sections` para tracking de progresso (sync automático)
- ✅ Reutiliza modelo modular `therapy_techniques` + `technique_sections` (não precisa alterar o frontend core)
- ✅ Reutiliza `protocols` para templates de sessão TRG
- ✅ Seções TRG são carregadas dinamicamente — basta registrar no banco e criar os componentes React
- ✅ Labels de terapia resolvidos via `getTherapyLabel()` — sem hardcode no frontend
