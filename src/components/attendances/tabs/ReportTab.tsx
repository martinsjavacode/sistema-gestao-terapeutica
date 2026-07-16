import { useQuery } from '@tanstack/react-query'
import { fetchAttendance, fetchEnergyAssessments, fetchChakras, fetchAuraField, fetchLifeAreas, fetchEmotions, fetchLimitingBeliefs, fetchBlockages, fetchEnergyDivorces, fetchTreatment } from '../../../services/attendances'
import { toast } from '../../../lib/toast'
import Button from '../../ui/Button'
import { FileText, Link2 } from 'lucide-react'
import { CHAKRA_LABELS, CHAKRA_ORDER, LIFE_AREA_LABELS, THERAPY_LABELS } from '../../../types/database'
import type { ChakraName } from '../../../types/database'

const CHAKRA_DESCRIPTIONS: Record<ChakraName, string> = {
  coronario: 'Responsável pela conexão espiritual, consciência superior e propósito de vida. Localizado no topo da cabeça, regula a glândula pineal. Quando bloqueado: sensação de vazio existencial, desconexão espiritual, cinismo, rigidez de pensamento, enxaquecas, sensibilidade à luz, fadiga neurológica.',
  frontal: 'Centro da intuição, clarividência e percepção extrassensorial. Localizado entre as sobrancelhas, regula a glândula hipófise. Quando bloqueado: confusão mental, dificuldade de concentração, dores de cabeça frequentes, pressão nos seios da face, insônia, dúvida crônica sobre si mesmo, dependência de opinião alheia.',
  laringeo: 'Governa a comunicação, expressão pessoal e verdade interior. Localizado na garganta, regula a tireoide. Quando bloqueado: dificuldade em se expressar, medo de falar em público, dores de garganta recorrentes, rigidez no pescoço e mandíbula, sensação de não ser ouvido, engolir as próprias palavras.',
  cardiaco: 'Centro do amor incondicional, compaixão e equilíbrio emocional. Localizado no centro do peito, regula o timo. Quando bloqueado: solidão crônica, dificuldade em perdoar, muros emocionais, respiração superficial, tensão entre as escápulas, apego ou afastamento extremo nos relacionamentos.',
  plexo_solar: 'Sede do poder pessoal, autoestima e força de vontade. Localizado acima do umbigo, regula o pâncreas. Quando bloqueado: baixa autoestima, indecisão crônica, problemas digestivos (náusea, refluxo, inchaço), perfeccionismo, dificuldade em impor limites, sensação de impotência.',
  sacral: 'Governa a criatividade, sexualidade e prazer. Localizado abaixo do umbigo, regula as gônadas. Quando bloqueado: bloqueio criativo, baixa libido, dormência emocional, rigidez nos quadris, vergonha em relação ao prazer, dificuldade em sentir alegria, instabilidade emocional.',
  raiz: 'Base da segurança, sobrevivência e conexão com a terra. Localizado na base da coluna, regula as suprarrenais. Quando bloqueado: ansiedade crônica, medo constante, insegurança financeira, dor lombar, problemas nas pernas e pés, fadiga persistente, dificuldade em se sentir seguro, extremidades frias.',
}

const HAWKINS_MAP: Record<number, { emotion: string; description: string }> = {
  20: { emotion: 'Vergonha', description: 'Estado mais destrutivo. Humilhação, sensação de ser sem valor e desejo de invisibilidade.' },
  30: { emotion: 'Culpa', description: 'Autopunição, remorso e pensamentos autossabotadores constantes.' },
  50: { emotion: 'Apatia', description: 'Desesperança total, sensação de impotência. A pessoa desiste de tentar.' },
  75: { emotion: 'Sofrimento', description: 'Tristeza profunda, perda e luto. Arrependimento constante do passado.' },
  100: { emotion: 'Medo', description: 'Ansiedade, paranoia e insegurança. O mundo é percebido como ameaçador.' },
  125: { emotion: 'Desejo', description: 'Apego e dependência. Busca compulsiva por prazer externo e insatisfação crônica.' },
  150: { emotion: 'Raiva', description: 'Frustração e ressentimento. Primeiro nível que gera movimento e ação.' },
  175: { emotion: 'Orgulho', description: 'Inflação do ego. Frágil e dependente de validação externa.' },
  200: { emotion: 'Coragem', description: 'Ponto de virada. A pessoa assume responsabilidade e enfrenta desafios.' },
  250: { emotion: 'Neutralidade', description: 'Flexibilidade e não-apego ao resultado. Aceitação da vida como é.' },
  310: { emotion: 'Disposição', description: 'Otimismo genuíno e abertura ao crescimento pessoal.' },
  350: { emotion: 'Aceitação', description: 'Responsabilidade total pela própria experiência. Co-criador da realidade.' },
  400: { emotion: 'Razão', description: 'Lógica, compreensão e discernimento racional. Busca pela verdade.' },
  500: { emotion: 'Amor', description: 'Amor incondicional, cura profunda, compaixão e reverência pela vida.' },
  540: { emotion: 'Alegria', description: 'Felicidade interna constante, independente de circunstâncias. Gratidão natural.' },
  600: { emotion: 'Paz', description: 'Serenidade profunda, transcendência do ego. Unidade com o todo.' },
  700: { emotion: 'Iluminação', description: 'Consciência pura. Dissolução completa da separação entre eu e universo.' },
}

function getHawkinsDescription(text: string): string {
  const match = text.match(/(\d+)\s*[Hh][Zz]/)
  if (!match) return ''
  const freq = parseInt(match[1])
  const entry = HAWKINS_MAP[freq]
  if (entry) return `${entry.emotion}: ${entry.description}`
  const freqs = Object.keys(HAWKINS_MAP).map(Number).sort((a, b) => a - b)
  const closest = freqs.reduce((prev, curr) => Math.abs(curr - freq) < Math.abs(prev - freq) ? curr : prev)
  if (Math.abs(closest - freq) <= 25) {
    const e = HAWKINS_MAP[closest]
    return `Próximo a ${closest} Hz (${e.emotion}): ${e.description}`
  }
  return ''
}

export default function ReportTab({ attendanceId }: { attendanceId: string }) {
  const { data: attendance } = useQuery({
    queryKey: ['attendance', attendanceId],
    queryFn: async () => { const { data } = await fetchAttendance(attendanceId); return data },
  })
  const { data: assessments = [] } = useQuery({
    queryKey: ['energy-assessments', attendanceId],
    queryFn: async () => { const { data } = await fetchEnergyAssessments(attendanceId); return data },
  })
  const { data: chakras = [] } = useQuery({
    queryKey: ['chakras', attendanceId],
    queryFn: async () => { const { data } = await fetchChakras(attendanceId); return data },
  })
  const { data: aura } = useQuery({
    queryKey: ['aura-field', attendanceId],
    queryFn: async () => { const { data } = await fetchAuraField(attendanceId); return data },
  })
  const { data: lifeAreas = [] } = useQuery({
    queryKey: ['life-areas', attendanceId],
    queryFn: async () => { const { data } = await fetchLifeAreas(attendanceId); return data },
  })
  const { data: emotions = [] } = useQuery({
    queryKey: ['emotions', attendanceId],
    queryFn: async () => { const { data } = await fetchEmotions(attendanceId); return data },
  })
  const { data: beliefs = [] } = useQuery({
    queryKey: ['beliefs', attendanceId],
    queryFn: async () => { const { data } = await fetchLimitingBeliefs(attendanceId); return data },
  })
  const { data: blockages = [] } = useQuery({
    queryKey: ['blockages', attendanceId],
    queryFn: async () => { const { data } = await fetchBlockages(attendanceId); return data },
  })
  const { data: divorces = [] } = useQuery({
    queryKey: ['divorces', attendanceId],
    queryFn: async () => { const { data } = await fetchEnergyDivorces(attendanceId); return data },
  })
  const { data: treatment } = useQuery({
    queryKey: ['treatment', attendanceId],
    queryFn: async () => { const { data } = await fetchTreatment(attendanceId); return data },
  })

  const hasData = assessments.length > 0 || chakras.length > 0 || (aura && (aura.state || aura.predominant_color)) || lifeAreas.length > 0 || emotions.length > 0 || beliefs.length > 0 || blockages.length > 0 || divorces.length > 0 || (treatment && (treatment.techniques || treatment.recommendations))

  const copyLink = () => {
    const url = `${window.location.origin}/sistema-gestao-terapeutica/report/${attendanceId}`
    navigator.clipboard.writeText(url).then(() => toast('Link copiado!')).catch(() => toast('Erro ao copiar', 'error'))
  }

  const generatePdf = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    let bodyHtml = ''

    // Header
    const clientName = attendance?.clients?.name ?? ''
    const date = attendance?.date ? new Date(attendance.date + 'T12:00:00').toLocaleDateString('pt-BR') : ''
    const therapy = attendance?.therapy_type ? THERAPY_LABELS[attendance.therapy_type] : ''
    const objective = attendance?.objective ?? ''

    bodyHtml += `
      <div class="header">
        <div class="logo">🔮</div>
        <h1>Relatório Terapêutico</h1>
        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Cliente</span><span class="meta-value">${clientName}</span></div>
          <div class="meta-item"><span class="meta-label">Data</span><span class="meta-value">${date}</span></div>
          <div class="meta-item"><span class="meta-label">Terapia</span><span class="meta-value">${therapy}</span></div>
          ${objective ? `<div class="meta-item"><span class="meta-label">Objetivo</span><span class="meta-value">${objective}</span></div>` : ''}
        </div>
      </div>
    `

    // Avaliação Energética
    if (assessments.length > 0) {
      const fieldLabels: Record<string, string> = { mental: 'Mental', emocional: 'Emocional', espiritual: 'Espiritual', fisico: 'Físico' }
      let cards = ''
      for (const a of assessments) {
        const css = a.has_imbalance ? 'imbalanced' : 'balanced'
        cards += `<div class="assessment-card ${css}"><div class="assessment-label">${fieldLabels[a.field_type] ?? a.field_type}</div><div class="assessment-status">${a.has_imbalance ? '⚠ Desequilíbrio' : '✓ Equilibrado'}${a.percentage ? ` (${a.percentage}%)` : ''}</div>${a.notes ? `<div class="notes">${a.notes}</div>` : ''}</div>`
      }
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">⚡</span><h2>AVALIAÇÃO ENERGÉTICA</h2></div><div class="assessment-grid">${cards}</div></div>`
    }

    // Chakras
    if (chakras.length > 0) {
      let cards = ''
      for (const name of CHAKRA_ORDER) {
        const c = chakras.find(ch => ch.name === name)
        if (!c) continue
        cards += `<div class="chakra-card"><div class="chakra-name">${CHAKRA_LABELS[name]}</div><div class="chakra-desc">${CHAKRA_DESCRIPTIONS[name]}</div><div class="chakra-status">Estado: ${c.state}${c.percentage ? ` (${c.percentage}%)` : ''} | Atividade: ${c.activity}</div>${c.notes ? `<div class="notes">${c.notes}</div>` : ''}</div>`
      }
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">🌈</span><h2>CHAKRAS</h2></div><p class="intro">Os chakras são centros energéticos que regulam o fluxo de energia vital, cada um associado a aspectos físicos, emocionais e espirituais.</p><div class="chakra-grid">${cards}</div></div>`
    }

    // Campo Áurico
    if (aura && (aura.state || aura.predominant_color)) {
      let items = ''
      if (aura.state) items += `<div class="aura-item"><span class="aura-label">Estado</span><span>${aura.state}${aura.state_percentage ? ` (${aura.state_percentage}%)` : ''}</span></div>`
      if (aura.size) items += `<div class="aura-item"><span class="aura-label">Tamanho</span><span>${aura.size}${aura.size_percentage ? ` (${aura.size_percentage}%)` : ''}</span></div>`
      if (aura.predominant_color) items += `<div class="aura-item"><span class="aura-label">Cor predominante</span><span>${aura.predominant_color}</span></div>`
      if (aura.excess_color) items += `<div class="aura-item"><span class="aura-label">Cor em excesso</span><span>${aura.excess_color}${aura.excess_color_percentage ? ` (${aura.excess_color_percentage}%)` : ''}</span></div>`
      if (aura.missing_color) items += `<div class="aura-item"><span class="aura-label">Cor em falta</span><span>${aura.missing_color}${aura.missing_color_percentage ? ` (${aura.missing_color_percentage}%)` : ''}</span></div>`
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">✨</span><h2>CAMPO ÁURICO</h2></div><div class="aura-grid">${items}</div>${aura.notes ? `<p class="notes">${aura.notes}</p>` : ''}</div>`
    }

    // Áreas da Vida
    if (lifeAreas.length > 0) {
      let items = ''
      for (const a of lifeAreas) {
        const parts: string[] = []
        if (a.score !== null) parts.push(`${a.score}/10`)
        if (a.percentage !== null) parts.push(`${a.percentage}%`)
        items += `<div class="life-item"><span class="life-name">${LIFE_AREA_LABELS[a.area]}</span><span class="life-score">${parts.join(' • ')}</span></div>`
      }
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">🎯</span><h2>ÁREAS DA VIDA</h2></div><div class="life-grid">${items}</div></div>`
    }

    // Frequências
    if (emotions.length > 0) {
      let items = ''
      for (const e of emotions) {
        const desc = getHawkinsDescription(e.description)
        items += `<div class="freq-card"><div class="freq-name">${e.description}</div>${desc ? `<div class="freq-desc">${desc}</div>` : ''}</div>`
      }
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">🎵</span><h2>FREQUÊNCIAS (Hz)</h2></div><p class="intro">Baseado na Escala de Consciência de Dr. David R. Hawkins.</p><div class="chakra-grid">${items}</div></div>`
    }

    // Crenças
    if (beliefs.length > 0) {
      const items = beliefs.map(b => `<li>${b.description}</li>`).join('')
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">🔗</span><h2>CRENÇAS LIMITANTES</h2></div><ul class="list">${items}</ul></div>`
    }

    // Bloqueios
    if (blockages.length > 0) {
      let items = ''
      for (const b of blockages) {
        const parts = [b.type]
        if (b.origin) parts.push(`Origem: ${b.origin}`)
        if (b.intensity) parts.push(`Intensidade: ${b.intensity}`)
        items += `<div class="list-item"><strong>${parts.join(' | ')}</strong>${b.notes ? `<br/><span class="notes">${b.notes}</span>` : ''}</div>`
      }
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">🚧</span><h2>BLOQUEIOS</h2></div><div class="list-items">${items}</div></div>`
    }

    // Divórcios
    if (divorces.length > 0) {
      let items = ''
      for (const d of divorces) {
        const parts = [d.what]
        if (d.reason) parts.push(`Motivo: ${d.reason}`)
        if (d.percentage !== null) parts.push(`${d.percentage}%`)
        if (d.result) parts.push(`Resultado: ${d.result}`)
        items += `<div class="list-item"><strong>${parts.join(' | ')}</strong></div>`
      }
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">✂️</span><h2>DIVÓRCIOS ENERGÉTICOS</h2></div><div class="list-items">${items}</div></div>`
    }

    // Tratamento
    if (treatment && (treatment.techniques || treatment.recommendations)) {
      let items = ''
      if (treatment.techniques) items += `<div class="treat-item"><h4>Técnicas</h4><p>${treatment.techniques}</p></div>`
      if (treatment.charts) items += `<div class="treat-item"><h4>Gráficos</h4><p>${treatment.charts}</p></div>`
      if (treatment.frequencies) items += `<div class="treat-item"><h4>Frequências</h4><p>${treatment.frequencies}</p></div>`
      if (treatment.recommendations) items += `<div class="treat-item"><h4>Recomendações</h4><p>${treatment.recommendations}</p></div>`
      if (treatment.exercises) items += `<div class="treat-item"><h4>Exercícios</h4><p>${treatment.exercises}</p></div>`
      bodyHtml += `<div class="section"><div class="section-header"><span class="section-icon">💎</span><h2>TRATAMENTO</h2></div>${items}</div>`
    }

    // Footer
    bodyHtml += `<div class="footer"><div class="footer-line"></div><p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} • Sistema de Gestão Terapêutica</p></div>`

    printWindow.document.write(`<html><head><title>Relatório — ${clientName}</title><style>${PDF_STYLES}</style></head><body>${bodyHtml}</body></html>`)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 300)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Relatório</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button variant="tab" onClick={copyLink} disabled={!hasData}><Link2 size={16} /> Copiar link</Button>
          <Button onClick={generatePdf} disabled={!hasData}><FileText size={16} /> Gerar PDF</Button>
        </div>
      </div>

      {!hasData ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>📋</p>
          <p style={{ color: 'var(--text-muted)' }}>Preencha as seções do atendimento para gerar o relatório automaticamente.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            O relatório será gerado automaticamente com base nas seções preenchidas. Use os botões acima para compartilhar com o cliente.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {assessments.length > 0 && <div className="report-preview-item">⚡ Avaliação Energética — {assessments.length}/4 campos</div>}
            {chakras.length > 0 && <div className="report-preview-item">🌈 Chakras — {chakras.length} registrados</div>}
            {aura && (aura.state || aura.predominant_color) && <div className="report-preview-item">✨ Campo Áurico</div>}
            {lifeAreas.length > 0 && <div className="report-preview-item">🎯 Áreas da Vida — {lifeAreas.length} áreas</div>}
            {emotions.length > 0 && <div className="report-preview-item">🎵 Frequências — {emotions.length} registradas</div>}
            {beliefs.length > 0 && <div className="report-preview-item">🔗 Crenças Limitantes — {beliefs.length}</div>}
            {blockages.length > 0 && <div className="report-preview-item">🚧 Bloqueios — {blockages.length}</div>}
            {divorces.length > 0 && <div className="report-preview-item">✂️ Divórcios Energéticos — {divorces.length}</div>}
            {treatment && (treatment.techniques || treatment.recommendations) && <div className="report-preview-item">💎 Tratamento</div>}
          </div>
        </div>
      )}
    </div>
  )
}

const PDF_STYLES = `
  @page { margin: 0; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #2d2d3a; line-height: 1.7; background: #fff; }
  .header { background: linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #1a0533 100%); color: white; padding: 48px 60px; text-align: center; position: relative; overflow: hidden; }
  .header::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%); }
  .logo { font-size: 3rem; margin-bottom: 12px; position: relative; }
  .header h1 { font-size: 1.8rem; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; color: #e8d5ff; position: relative; }
  .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; max-width: 600px; margin: 0 auto; text-align: left; position: relative; }
  .meta-item { background: rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 16px; border: 1px solid rgba(255,255,255,0.1); }
  .meta-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
  .meta-value { font-size: 0.9rem; font-weight: 500; color: #f0d78c; }
  .section { padding: 32px 60px; border-bottom: 1px solid #f0f0f0; page-break-inside: avoid; }
  .section:last-of-type { border-bottom: none; }
  .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6b21a8, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
  .section-header h2 { font-size: 1.1rem; font-weight: 600; color: #2d1b69; text-transform: uppercase; letter-spacing: 0.5px; }
  .intro { font-size: 0.85rem; color: #666; font-style: italic; margin-bottom: 16px; padding: 8px 16px; border-left: 3px solid #e8d5ff; background: #faf8ff; border-radius: 0 6px 6px 0; }
  .assessment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .assessment-card { border-radius: 8px; padding: 14px 18px; border: 1px solid #e8e8e8; }
  .assessment-card.balanced { background: #f0fdf4; border-color: #bbf7d0; }
  .assessment-card.imbalanced { background: #fef2f2; border-color: #fecaca; }
  .assessment-label { font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
  .assessment-status { font-size: 0.8rem; }
  .chakra-grid { display: flex; flex-direction: column; gap: 12px; }
  .chakra-card, .freq-card { background: #faf8ff; border: 1px solid #e8d5ff; border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 14px 18px; }
  .chakra-name, .freq-name { font-weight: 600; color: #6b21a8; font-size: 0.9rem; margin-bottom: 4px; }
  .chakra-desc, .freq-desc { font-size: 0.78rem; color: #777; margin-bottom: 6px; line-height: 1.5; }
  .chakra-status { font-size: 0.82rem; color: #4a4a5a; }
  .aura-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .aura-item { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; background: #f9f9fb; border: 1px solid #eee; border-radius: 8px; }
  .aura-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: #999; }
  .life-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .life-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f9f9fb; border-radius: 6px; border: 1px solid #eee; }
  .life-name { font-size: 0.85rem; font-weight: 500; }
  .life-score { font-size: 0.8rem; background: linear-gradient(135deg, #6b21a8, #8b5cf6); color: white; padding: 2px 10px; border-radius: 12px; font-weight: 600; }
  .list { list-style: none; padding: 0; }
  .list li { padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 0.88rem; }
  .list li::before { content: '•'; color: #8b5cf6; margin-right: 10px; font-weight: bold; }
  .list li:last-child { border-bottom: none; }
  .list-items .list-item { padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 0.88rem; }
  .list-items .list-item:last-child { border-bottom: none; }
  .notes { font-size: 0.78rem; color: #888; margin-top: 4px; }
  .treat-item { margin-bottom: 16px; }
  .treat-item h4 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #6b21a8; margin-bottom: 6px; }
  .treat-item p { font-size: 0.88rem; color: #4a4a5a; line-height: 1.6; }
  .footer { padding: 24px 60px; text-align: center; }
  .footer-line { height: 2px; background: linear-gradient(90deg, transparent, #8b5cf6, transparent); margin-bottom: 16px; }
  .footer p { font-size: 0.75rem; color: #999; letter-spacing: 0.5px; }
  @media print { body { padding: 0; } .section { page-break-inside: avoid; } }
`
