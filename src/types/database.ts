// Domain types — SGT

export type TherapyType = 'radiestesia' | 'mesa_radionica' | 'corte_energetico' | 'numerologia' | 'tarot' | 'reiki' | 'outro'
export type EnergyFieldType = 'mental' | 'emocional' | 'espiritual' | 'fisico'
export type ChakraName = 'coronario' | 'frontal' | 'laringeo' | 'cardiaco' | 'plexo_solar' | 'sacral' | 'raiz'
export type ChakraState = 'equilibrado' | 'hiperativo' | 'hipoativo' | 'bloqueado'
export type ChakraActivity = 'normal' | 'acelerada' | 'lenta' | 'parada'
export type LifeAreaType = 'financeiro' | 'profissional' | 'amoroso' | 'familiar' | 'espiritual' | 'saude' | 'missao' | 'prosperidade'

export interface Client {
  id: string
  name: string
  birth_date: string
  cpf: string | null
  sex: string | null
  marital_status: string | null
  profession: string | null
  whatsapp: string | null
  email: string | null
  city: string | null
  photo_url: string | null
  notes: string | null
  active: boolean
  created_at: string
}

export interface Attendance {
  id: string
  client_id: string
  date: string
  time: string | null
  therapy_type: TherapyType
  objective: string | null
  bovis_frequency: number | null
  notes: string | null
  report_content: string | null
  report_pdf_url: string | null
  created_at: string
  client?: Client
}

export interface EnergyAssessment {
  id: string
  attendance_id: string
  field_type: EnergyFieldType
  has_imbalance: boolean
  percentage: number | null
  notes: string | null
  created_at: string
}

export interface Chakra {
  id: string
  attendance_id: string
  name: ChakraName
  state: ChakraState
  percentage: number | null
  activity: ChakraActivity
  color: string | null
  gland: string | null
  organ: string | null
  symptoms: string | null
  notes: string | null
  created_at: string
}

export interface AuraField {
  id: string
  attendance_id: string
  state: string | null
  state_percentage: number | null
  size: string | null
  size_percentage: number | null
  predominant_color: string | null
  excess_color: string | null
  excess_color_percentage: number | null
  missing_color: string | null
  missing_color_percentage: number | null
  notes: string | null
  created_at: string
}

export interface LifeArea {
  id: string
  attendance_id: string
  area: LifeAreaType
  score: number | null
  percentage: number | null
  notes: string | null
  created_at: string
}

export interface Emotion {
  id: string
  attendance_id: string
  description: string
  created_at: string
}

export interface LimitingBelief {
  id: string
  attendance_id: string
  description: string
  created_at: string
}

export interface Blockage {
  id: string
  attendance_id: string
  type: string
  origin: string | null
  intensity: string | null
  notes: string | null
  created_at: string
}

export interface EnergyDivorce {
  id: string
  attendance_id: string
  what: string
  reason: string | null
  percentage: number | null
  result: string | null
  notes: string | null
  created_at: string
}

export interface Treatment {
  id: string
  attendance_id: string
  techniques: string | null
  charts: string | null
  recommendations: string | null
  frequencies: string | null
  exercises: string | null
  created_at: string
}

export const CHAKRA_ORDER: ChakraName[] = ['coronario', 'frontal', 'laringeo', 'cardiaco', 'plexo_solar', 'sacral', 'raiz']

export const CHAKRA_LABELS: Record<ChakraName, string> = {
  coronario: 'Coronário',
  frontal: 'Frontal (3º Olho)',
  laringeo: 'Laríngeo',
  cardiaco: 'Cardíaco',
  plexo_solar: 'Plexo Solar',
  sacral: 'Sacral',
  raiz: 'Raiz',
}

export const LIFE_AREA_LABELS: Record<LifeAreaType, string> = {
  financeiro: 'Financeiro',
  profissional: 'Profissional',
  amoroso: 'Amoroso',
  familiar: 'Familiar',
  espiritual: 'Espiritual',
  saude: 'Saúde',
  missao: 'Missão',
  prosperidade: 'Prosperidade',
}

export const THERAPY_LABELS: Record<TherapyType, string> = {
  radiestesia: 'Radiestesia',
  mesa_radionica: 'Mesa Radiônica',
  corte_energetico: 'Corte Energético',
  numerologia: 'Numerologia',
  tarot: 'Tarot',
  reiki: 'Reiki',
  outro: 'Outro',
}
