import './Skeleton.css'

export function Skeleton({ width = '100%', height = '1rem' }: { width?: string; height?: string }) {
  return <div className="skeleton" style={{ width, height }} aria-hidden="true" />
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true">
      <table>
        <thead><tr>{Array.from({ length: cols }, (_, i) => <th key={i}><Skeleton width="80%" /></th>)}</tr></thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>{Array.from({ length: cols }, (_, c) => <td key={c}><Skeleton /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardsSkeleton() {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="card">
          <Skeleton width="60%" height="0.9rem" />
          <Skeleton width="80%" height="1.5rem" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Header skeleton */}
      <div className="page-header">
        <div>
          <Skeleton width="180px" height="1.5rem" />
          <Skeleton width="240px" height="0.9rem" />
        </div>
        <Skeleton width="160px" height="44px" />
      </div>

      {/* Cards skeleton */}
      <div className="dashboard-stats">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-header">
              <Skeleton width="40px" height="40px" />
            </div>
            <div className="stat-card-body">
              <Skeleton width="60px" height="1.8rem" />
              <Skeleton width="100px" height="0.8rem" />
            </div>
          </div>
        ))}
      </div>

      {/* List skeleton */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <Skeleton width="180px" height="1.1rem" />
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
              <Skeleton width="100%" height="1rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div aria-hidden="true" className="form-grid">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <Skeleton width="80px" height="0.85rem" />
          <Skeleton width="100%" height="44px" />
        </div>
      ))}
    </div>
  )
}
