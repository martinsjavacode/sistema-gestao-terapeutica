import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }

  render() {
    if (this.state.error) {
      return (
        <div className="auth">
          <h1>🔮 SGT</h1>
          <p style={{ color: 'var(--text-muted)' }}>Algo deu errado.</p>
          <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      )
    }
    return this.props.children
  }
}
