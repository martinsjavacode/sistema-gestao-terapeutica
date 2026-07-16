import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import './Auth.css'

export default function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message)
    else navigate('/', { replace: true })
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { data } = await supabase.rpc('is_email_authorized', { p_email: email })
    if (!data) { setError('Email não autorizado. Solicite acesso ao administrador.'); setLoading(false); return }
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/sistema-gestao-terapeutica/' } })
    if (error) { setError(error.message); setLoading(false); return }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) setError(loginError.message)
    else navigate('/', { replace: true })
    setLoading(false)
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>🔮 SGT</h1>
          <p className="auth-subtitle">Sistema de Gestão Terapêutica</p>
        </div>
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="auth-field">
            <label>Senha</label>
            <div className="auth-password">
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)} aria-label="Mostrar senha">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
        <button type="button" className="auth-btn-link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
          {mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}
