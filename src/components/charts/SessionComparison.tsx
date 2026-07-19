/**
 * SessionComparison — Comparativo visual entre primeira e última sessão.
 * Mostra barras lado a lado para os 4 campos energéticos.
 */
import TrendIndicator from './TrendIndicator'

interface FieldComparison {
  label: string
  color: string
  first: number | null
  last: number | null
}

interface Props {
  fields: FieldComparison[]
  firstDate: string
  lastDate: string
}

export default function SessionComparison({ fields, firstDate, lastDate }: Props) {
  const hasData = fields.some(f => f.first !== null && f.last !== null)
  if (!hasData) return null

  return (
    <div className="session-comparison">
      <div className="session-comparison-header">
        <span className="session-comparison-label">
          <span className="session-comparison-dot session-comparison-dot--first" />
          Primeira ({firstDate})
        </span>
        <span className="session-comparison-label">
          <span className="session-comparison-dot session-comparison-dot--last" />
          Última ({lastDate})
        </span>
      </div>

      <div className="session-comparison-fields">
        {fields.map(field => {
          if (field.first === null && field.last === null) return null
          return (
            <div key={field.label} className="session-comparison-field">
              <div className="session-comparison-field-header">
                <span className="session-comparison-field-label">{field.label}</span>
                <TrendIndicator current={field.last} previous={field.first} size="sm" />
              </div>
              <div className="session-comparison-bars">
                <div className="session-comparison-bar-row">
                  <div className="session-comparison-bar-track">
                    <div
                      className="session-comparison-bar session-comparison-bar--first"
                      style={{ width: `${field.first ?? 0}%`, background: field.color, opacity: 0.4 }}
                    />
                  </div>
                  <span className="session-comparison-bar-value">{field.first ?? '—'}%</span>
                </div>
                <div className="session-comparison-bar-row">
                  <div className="session-comparison-bar-track">
                    <div
                      className="session-comparison-bar session-comparison-bar--last"
                      style={{ width: `${field.last ?? 0}%`, background: field.color }}
                    />
                  </div>
                  <span className="session-comparison-bar-value">{field.last ?? '—'}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
