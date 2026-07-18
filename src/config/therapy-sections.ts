/**
 * Configuração de seções por tipo de terapia.
 *
 * Para adicionar uma nova terapia:
 * 1. Adicione o valor em TherapyType (src/types/database.ts)
 * 2. Adicione o label em THERAPY_LABELS (src/types/database.ts)
 * 3. Adicione a entrada aqui em THERAPY_SECTIONS com as seções desejadas
 * 4. Adicione em ACTIVE_THERAPIES para que apareça no select
 */
import type { TherapyType } from '../types/database'

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

/** Catálogo completo de seções disponíveis */
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

/** Mapa de seções por tipo de terapia */
export const THERAPY_SECTIONS: Record<TherapyType, SectionKey[]> = {
  radiestesia: [
    'assessment',
    'chakras',
    'aura',
    'life-areas',
    'emotions',
    'treatment',
    'report',
  ],
  corte_energetico: [
    'chakras',
    'emotions',
    'beliefs',
    'divorces',
    'treatment',
    'report',
  ],
  // Terapias inativas — manter config para quando forem reativadas
  mesa_radionica: ['assessment', 'chakras', 'aura', 'emotions', 'treatment', 'report'],
  numerologia: ['assessment', 'treatment', 'report'],
  tarot: ['assessment', 'treatment', 'report'],
  reiki: ['chakras', 'aura', 'treatment', 'report'],
  outro: ['assessment', 'chakras', 'aura', 'life-areas', 'emotions', 'beliefs', 'divorces', 'treatment', 'report'],
}

/**
 * Terapias que aparecem no select de criação de atendimento.
 * Para adicionar uma nova terapia ao select, basta incluí-la aqui.
 */
export const ACTIVE_THERAPIES: TherapyType[] = [
  'radiestesia',
  'corte_energetico',
]

/** Retorna as seções configuradas para um tipo de terapia */
export function getSectionsForTherapy(therapyType: TherapyType): SectionConfig[] {
  const keys = THERAPY_SECTIONS[therapyType] ?? THERAPY_SECTIONS.outro
  return keys.map(key => ({ key, label: ALL_SECTIONS[key] }))
}
