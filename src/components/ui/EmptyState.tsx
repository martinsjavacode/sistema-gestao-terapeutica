import { type ReactNode } from 'react'
import Button from './Button'
import { Users, ClipboardList, Calendar, Search, FileText, Inbox } from 'lucide-react'

interface Props {
  icon?: 'clients' | 'attendances' | 'schedule' | 'search' | 'reports' | 'generic'
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
}

const icons: Record<string, ReactNode> = {
  clients: <Users size={40} />,
  attendances: <ClipboardList size={40} />,
  schedule: <Calendar size={40} />,
  search: <Search size={40} />,
  reports: <FileText size={40} />,
  generic: <Inbox size={40} />,
}

export default function EmptyState({ icon = 'generic', title, description, actionLabel, onAction, children }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icons[icon]}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="empty-state-action">
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  )
}
