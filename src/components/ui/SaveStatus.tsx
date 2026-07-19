interface Props {
  status: 'idle' | 'saving' | 'saved'
}

export default function SaveStatus({ status }: Props) {
  const labels = { idle: 'Sem alterações', saving: 'Salvando...', saved: 'Salvo' }
  return (
    <div className={`save-status ${status}`}>
      <span className="dot" />
      <span>{labels[status]}</span>
    </div>
  )
}
