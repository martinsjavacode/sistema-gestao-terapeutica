import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}

export default function Pagination({ currentPage, totalPages, totalItems, perPage, onPageChange, onPerPageChange }: Props) {
  if (totalItems <= 10) return null
  const start = (currentPage - 1) * perPage + 1
  const end = Math.min(currentPage * perPage, totalItems)

  return (
    <div className="pagination">
      <div className="pagination-left">
        <select className="pagination-select" value={perPage} onChange={e => onPerPageChange(+e.target.value)}>
          {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="pagination-label">por página</span>
      </div>
      <span className="pagination-info">{start}–{end} de {totalItems}</span>
      <div className="pagination-right">
        <button className="pagination-btn" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></button>
        <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Próxima página"><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}
