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
