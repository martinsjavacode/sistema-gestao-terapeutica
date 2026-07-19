import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAuraField, upsertAuraField } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import SaveStatus from '../../ui/SaveStatus'
import Select from '../../ui/Select'
import MultiSelect from '../../ui/MultiSelect'

const SIZES = [
  { value: 'expandido', label: 'Expandido — Energia irradiante, extroversão, estado elevado de consciência' },
  { value: 'regular', label: 'Regular — Equilíbrio energético, estado saudável e estável' },
  { value: 'encolhido', label: 'Encolhido — Retraimento, medo, proteção excessiva, baixa vitalidade' },
]

const PROTECTIONS = [
  { value: 'aberta', label: 'Aberta — Vulnerável a energias externas, sem filtro energético' },
  { value: 'media', label: 'Média — Proteção parcial, permeável a influências' },
  { value: 'fechada', label: 'Fechada — Bem protegida, impermeável a interferências externas' },
]

const COLORS = [
  { value: 'vermelho', label: '🔴 Vermelho — Vitalidade, paixão, força física, enraizamento' },
  { value: 'laranja', label: '🟠 Laranja — Criatividade, emoções, sexualidade, prazer' },
  { value: 'amarelo', label: '🟡 Amarelo — Intelecto, poder pessoal, otimismo, clareza mental' },
  { value: 'verde', label: '🟢 Verde — Cura, equilíbrio, amor, compaixão, renovação' },
  { value: 'azul', label: '🔵 Azul — Comunicação, paz, verdade, serenidade, expressão' },
  { value: 'indigo', label: '🟣 Índigo — Intuição, percepção extrassensorial, sabedoria interior' },
  { value: 'violeta', label: '💜 Violeta — Espiritualidade, transmutação, conexão divina' },
  { value: 'cinza', label: '⚫ Cinza — Bloqueio, estagnação, cansaço, energia densa' },
  { value: 'preto', label: '⬛ Preto — Doença, negatividade acumulada, dor, entidades' },
]

export default function AuraFieldTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const { data: aura } = useQuery({
    queryKey: ['aura-field', attendanceId],
    queryFn: async () => { const { data } = await fetchAuraField(attendanceId); return data },
  })

  const [size, setSize] = useState(aura?.size ?? '')
  const [sizePercentage, setSizePercentage] = useState(aura?.size_percentage?.toString() ?? '')
  const [protection, setProtection] = useState(aura?.state ?? '')
  const [protectionPercentage, setProtectionPercentage] = useState(aura?.state_percentage?.toString() ?? '')
  const [predominantColor, setPredominantColor] = useState(aura?.predominant_color ?? '')
  const [excessColors, setExcessColors] = useState<string[]>(aura?.excess_color ? aura.excess_color.split(',') : [])
  const [missingColors, setMissingColors] = useState<string[]>(aura?.missing_color ? aura.missing_color.split(',') : [])
  const [notes, setNotes] = useState(aura?.notes ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Sync local state when server data changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (aura) {
      setSize(aura.size ?? '')
      setSizePercentage(aura.size_percentage?.toString() ?? '')
      setProtection(aura.state ?? '')
      setProtectionPercentage(aura.state_percentage?.toString() ?? '')
      setPredominantColor(aura.predominant_color ?? '')
      setExcessColors(aura.excess_color ? aura.excess_color.split(',') : [])
      setMissingColors(aura.missing_color ? aura.missing_color.split(',') : [])
      setNotes(aura.notes ?? '')
    }
  }, [aura])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (saveStatus !== 'saving') return
    const timer = setTimeout(async () => {
      const { error } = await upsertAuraField({
        attendance_id: attendanceId,
        state: protection || null,
        state_percentage: protectionPercentage ? parseFloat(protectionPercentage) : null,
        size: size || null,
        size_percentage: sizePercentage ? parseFloat(sizePercentage) : null,
        predominant_color: predominantColor || null,
        excess_color: excessColors.length > 0 ? excessColors.join(',') : null,
        excess_color_percentage: null,
        missing_color: missingColors.length > 0 ? missingColors.join(',') : null,
        missing_color_percentage: null,
        notes: notes || null,
      })
      if (error) toast('Erro ao salvar', 'error')
      else qc.invalidateQueries({ queryKey: ['aura-field', attendanceId] })
      setSaveStatus('saved')
    }, 1500)
    return () => clearTimeout(timer)
  }, [size, sizePercentage, protection, protectionPercentage, predominantColor, excessColors, missingColors, notes, saveStatus, attendanceId, qc])

  const change = () => setSaveStatus('saving')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Campo Áurico</h2>
        <SaveStatus status={saveStatus} />
      </div>

      {/* Tamanho e Proteção */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end' }}>
          <Select label="Tamanho" value={size} onChange={v => { setSize(v); change() }} options={SIZES} placeholder="Selecione" />
          <label className="form-label">%<input type="number" min="0" max="100" step="0.1" value={sizePercentage} onChange={e => { setSizePercentage(e.target.value); change() }} style={{ width: '80px' }} /></label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end', marginTop: 'var(--space-3)' }}>
          <Select label="Proteção" value={protection} onChange={v => { setProtection(v); change() }} options={PROTECTIONS} placeholder="Selecione" />
          <label className="form-label">%<input type="number" min="0" max="100" step="0.1" value={protectionPercentage} onChange={e => { setProtectionPercentage(e.target.value); change() }} style={{ width: '80px' }} /></label>
        </div>
      </div>

      {/* Cores */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--gold)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cores</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Select label="Cor predominante" value={predominantColor} onChange={v => { setPredominantColor(v); change() }} options={COLORS} placeholder="Selecione" />
          <MultiSelect label="Cor em excesso" values={excessColors} onChange={v => { setExcessColors(v); change() }} options={COLORS} placeholder="Selecione (se houver)" />
          <MultiSelect label="Cor em falta" values={missingColors} onChange={v => { setMissingColors(v); change() }} options={COLORS} placeholder="Selecione (se houver)" />
        </div>
      </div>

      {/* Observações */}
      <label className="form-label">
        Observações
        <textarea value={notes} onChange={e => { setNotes(e.target.value); change() }} rows={3} placeholder="Observações sobre o campo áurico..." />
      </label>
    </div>
  )
}
