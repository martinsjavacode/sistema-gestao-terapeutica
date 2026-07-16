import type { ReactNode } from 'react'

interface Props {
  variant: 'success' | 'danger' | 'warning' | 'info'
  children: ReactNode
}

export default function Badge({ variant, children }: Props) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
