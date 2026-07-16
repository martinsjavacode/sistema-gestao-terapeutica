import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAuraField, upsertAuraField } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import SaveStatus from '../../ui/SaveStatus'
import Select from '../../ui/Select'

const STATES = [
  { value: 'integro', label: 'Íntegro' },
  { value: 'aberto', label: 'Aberto' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'rompido', label: 'Rompido' },
  { value: 'poroso', label: 'Poroso' },
  { value: 'contraido', label: 'Contraído' },
  { value: 'expandido', label: 'Expandido' },
  { value: 'irregular', label: 'Irregular' },
]

const SIZES = [
  { value: 'muito_pequeno', label: 'Muito Pequeno' },
  { value: 'pequeno', label: 'Pequeno' },
  { value: 'normal', label: 'Normal' },
  { value: 'grande', label: 'Grande' },
  { value: 'muito_grande', label: 'Muito Grande' },
  { value: 'expandido', label: 'Expandido' },
]

const COLORS = [
  { value: 'vermelho', label: '🔴 Vermelho — Vitalidade, paixão, raiva' },
  { value: 'laranja', label: '🟠 Laranja — Criatividade, energia, emoção' },
  { value: 'amarelo', label: '🟡 Amarelo — Intelecto, otimismo, poder pessoal' },
  { value: 'verde', label: '🟢 Verde — Cura, equilíbrio, amor' },
  { value: 'azul', label: '🔵 Azul — Comunicação, paz, verdade' },
  { value: 'indigo', label: '🟣 Índigo — Intuição, percepção, sabedoria' },
  { value: 'violeta', label: '💜 Violeta — Espiritualidade, transmutação' },
  { value: 'rosa', label: '💗 Rosa — Amor incondicional, ternura' },
  { value: 'dourado', label: '✨ Dourado — Proteção divina, iluminação' },
  { value: 'branco', label: '⚪ Branco — Pureza, conexão espiritual' },
  { value: 'cinza', label: '⚫ Cinza — Bloqueio, estagnação' },
  { value: 'marrom', label: '🟤 Marrom — Materialismo, desequilíbrio' },
  { value: 'preto', label: '⬛ Preto — Doença, negatividade, dor' },
]

export default function AuraFieldTab({ attendanceId }: { attendanceId: string }) {
  const qc = useQueryClient()
  const { data: aura } = useQuery({
    queryKey: ['aura-field', attendanceId],
    queryFn: async () => { const { data } = await fetchAuraField(attendanceId); return data },
  })

  const [state, setState] = useState(aura?.state ?? '')
  const [statePercentage, setStatePercentage] = useState(aura?.state_percentage?.toString() ?? '')
  const [size, setSize] = useState(aura?.size ?? '')
  const [sizePercentage, setSizePercentage] = useState(aura?.size_percentage?.toString() ?? '')
  const [predominantColor, setPredominantColor] = useState(aura?.predominant_color ?? '')
  const [excessColor, setExcessColor] = useState(aura?.excess_color ?? '')
  const [excessColorPercentage, setExcessColorPercentage] = useState(aura?.excess_color_percentage?.toString() ?? '')
  const [missingColor, setMissingColor] = useState(aura?.missing_color ?? '')
  const [missingColorPercentage, setMissingColorPercentage] = useState(aura?.missing_color_percentage?.toString() ?? '')
  const [notes, setNotes] = useState(aura?.notes ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (aura) {
      setState(aura.state ?? ''); setStatePercentage(aura.state_percentage?.toString() ?? '')
      setSize(aura.size ?? ''); setSizePercentage(aura.size_percentage?.toString() ?? '')
      setPredominantColor(aura.predominant_color ?? '')
      setExcessColor(aura.excess_color ?? ''); setExcessColorPercentage(aura.excess_color_percentage?.toString() ?? '')
      setMissingColor(aura.missing_color ?? ''); setMissingColorPercentage(aura.missing_color_percentage?.toString() ?? '')
      setNotes(aura.notes ?? '')
    }
  }, [aura])

  useEffect(() => {
    if (saveStatus !== 'saving') return
    const timer = setTimeout(async () => {
      const { error } = await upsertAuraField({
        attendance_id: attendanceId,
        state: state || null,
        state_percentage: statePercentage ? parseFloat(statePercentage) : null,
        size: size || null,
        size_percentage: sizePercentage ? parseFloat(sizePercentage) : null,
        predominant_color: predominantColor || null,
        excess_color: excessColor || null,
        excess_color_percentage: excessColorPercentage ? parseFloat(excessColorPercentage) : null,
        missing_color: missingColor || null,
        missing_color_percentage: missingColorPercentage ? parseFloat(missingColorPercentage) : null,
        notes: notes || null,
      })
      if (error) toast('Erro ao salvar', 'error')
      else qc.invalidateQueries({ queryKey: ['aura-field', attendanceId] })
      setSaveStatus('saved')
    }, 1500)
    return () => clearTimeout(timer)
  }, [state, statePercentage, size, sizePercentage, predominantColor, excessColor, excessColorPercentage, missingColor, missingColorPercentage, notes, saveStatus, attendanceId, qc])

  const change = () => setSaveStatus('saving')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Campo Áurico</h2>
        <SaveStatus status={saveStatus} />
      </div>

      {/* Estado e Tamanho */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--violet-light)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estrutura</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end' }}>
          <Select label="Estado" value={state} onChange={v => { setState(v); change() }} options={STATES} placeholder="Selecione o estado" />
          <label className="form-label">%<input type="number" min="0" max="100" step="0.1" value={statePercentage} onChange={e => { setStatePercentage(e.target.value); change() }} style={{ width: '80px' }} /></label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end', marginTop: 'var(--space-3)' }}>
          <Select label="Tamanho" value={size} onChange={v => { setSize(v); change() }} options={SIZES} placeholder="Selecione o tamanho" />
          <label className="form-label">%<input type="number" min="0" max="100" step="0.1" value={sizePercentage} onChange={e => { setSizePercentage(e.target.value); change() }} style={{ width: '80px' }} /></label>
        </div>
      </div>

      {/* Cores */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--gold)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cores</h3>
        
        <Select label="Cor predominante" value={predominantColor} onChange={v => { setPredominantColor(v); change() }} options={COLORS} placeholder="Selecione a cor principal" />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end', marginTop: 'var(--space-3)' }}>
          <Select label="Cor em excesso" value={excessColor} onChange={v => { setExcessColor(v); change() }} options={COLORS} placeholder="Selecione (se houver)" />
          <label className="form-label">%<input type="number" min="0" max="100" step="0.1" value={excessColorPercentage} onChange={e => { setExcessColorPercentage(e.target.value); change() }} style={{ width: '80px' }} /></label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end', marginTop: 'var(--space-3)' }}>
          <Select label="Cor em falta" value={missingColor} onChange={v => { setMissingColor(v); change() }} options={COLORS} placeholder="Selecione (se houver)" />
          <label className="form-label">%<input type="number" min="0" max="100" step="0.1" value={missingColorPercentage} onChange={e => { setMissingColorPercentage(e.target.value); change() }} style={{ width: '80px' }} /></label>
        </div>
      </div>

      {/* Observações */}
      <label className="form-label">
        Observações
        <textarea value={notes} onChange={e => { setNotes(e.target.value); change() }} rows={3} placeholder="Observações gerais sobre o campo áurico..." />
      </label>
    </div>
  )
}
