/**
 * Configuração de seções por tipo de terapia.
 *
 * Este módulo agora funciona como **fallback** para quando os dados do banco
 * ainda não foram carregados. O fluxo principal usa as técnicas/seções vindas
 * do contexto do tenant (useTenant → techniques).
 *
 * Para adicionar uma nova terapia:
 * 1. Adicione na tabela therapy_techniques (via migration ou admin)
 * 2. Configure as seções em technique_sections
 * 3. Ative para o tenant em tenant_techniques
 */
import type { TherapyType } from '../types/database'
import type { TechniqueWithSections } from '../services/techniques'

export type SectionKey =
  | 'assessment'
  | 'chakras'
  | 'aura'
  | 'life-areas'
  | 'emotions'
  | 'beliefs'
  | 'divorces'
  | 'treatment'
  | 'report'

export interface SectionConfig {
  key: SectionKey
  label: string
}

/** Catálogo completo de seções disponíveis (fallback estático) */
export const ALL_SECTIONS: Record<SectionKey, string> = {
  assessment: 'Avaliação Energética',
  chakras: 'Chakras',
  aura: 'Campo Áurico',
  'life-areas': 'Áreas da Vida',
  emotions: 'Frequências (Hz)',
  beliefs: 'Crenças Limitantes',
  divorces: 'Cortes Realizados',
  treatment: 'Recomendações',
  report: 'Relatório',
}

/** Mapa estático de seções por tipo de terapia (FALLBACK) */
const THERAPY_SECTIONS_FALLBACK: Record<TherapyType, SectionKey[]> = {
  radiestesia: ['assessment', 'chakras', 'aura', 'life-areas', 'emotions', 'treatment', 'report'],
  corte_energetico: ['chakras', 'emotions', 'beliefs', 'divorces', 'treatment', 'report'],
  mesa_radionica: ['assessment', 'chakras', 'aura', 'emotions', 'treatment', 'report'],
  numerologia: ['assessment', 'treatment', 'report'],
  tarot: ['assessment', 'treatment', 'report'],
  reiki: ['chakras', 'aura', 'treatment', 'report'],
  outro: ['assessment', 'chakras', 'aura', 'life-areas', 'emotions', 'beliefs', 'divorces', 'treatment', 'report'],
}

/**
 * Retorna seções de uma técnica usando dados do banco.
 * Usa o array de TechniqueWithSections do useTenant.
 */
export function getSectionsFromTechnique(technique: TechniqueWithSections): SectionConfig[] {
  return technique.sections.map(s => ({
    key: s.id as SectionKey,
    label: s.name,
  }))
}

/**
 * Retorna seções para um therapy_type usando dados do banco.
 * Fallback para config estático se a técnica não for encontrada.
 */
export function getSectionsForTherapy(
  therapyType: TherapyType,
  techniques?: TechniqueWithSections[]
): SectionConfig[] {
  // Se temos dados do banco, usa eles
  if (techniques?.length) {
    const technique = techniques.find(t => t.id === therapyType)
    if (technique) {
      return getSectionsFromTechnique(technique)
    }
  }

  // Fallback estático
  const keys = THERAPY_SECTIONS_FALLBACK[therapyType] ?? THERAPY_SECTIONS_FALLBACK.outro
  return keys.map(key => ({ key, label: ALL_SECTIONS[key] }))
}

/**
 * Retorna as técnicas ativas do tenant (para usar no select de criação).
 * Fallback para as 2 técnicas default se não tiver dados do banco.
 */
export function getActiveTechniques(techniques?: TechniqueWithSections[]): { id: string; name: string }[] {
  if (techniques?.length) {
    return techniques.map(t => ({ id: t.id, name: t.name }))
  }

  // Fallback
  return [
    { id: 'radiestesia', name: 'Radiestesia' },
    { id: 'corte_energetico', name: 'Corte Energético' },
  ]
}

/**
 * @deprecated Use getSectionsForTherapy com techniques do useTenant.
 * Mantido para compatibilidade temporária.
 */
export const ACTIVE_THERAPIES: TherapyType[] = ['radiestesia', 'corte_energetico']
