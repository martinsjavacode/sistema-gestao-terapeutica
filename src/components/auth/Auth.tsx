import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import './Auth.css'

type Mode = 'login' | 'signup' | 'onboarding'

interface PendingInvite {
  invite_id: string
  tenant_id: string
  tenant_name: string
  role_name: string
}

export default function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message)
      setLoading(false)
      return
    }

    // Verificar se já tem tenant provisionado
    const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
    if (!user) {
      // User autenticado mas sem tenant — precisa do onboarding
      setMode('onboarding')
      checkPendingInvite()
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + '/sistema-gestao-terapeutica/' },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Supabase pode auto-confirmar em dev — tentar login imediato
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      // Provavelmente precisa confirmar email
      setError('Conta criada! Verifique seu email para confirmar, depois faça login.')
      setMode('login')
      setLoading(false)
      return
    }

    // Signup + login ok — provisionar tenant e user imediatamente
    if (tenantName.trim()) {
      const { error: rpcError } = await supabase.rpc('provision_tenant', {
        p_tenant_name: tenantName.trim(),
        p_owner_name: ownerName.trim() || null,
      })

      if (rpcError) {
        if (rpcError.message.includes('já possui uma conta')) {
          navigate('/', { replace: true })
        } else {
          setError(rpcError.message)
        }
        setLoading(false)
        return
      }

      navigate('/', { replace: true })
    } else {
      // Sem nome de consultório — ir para onboarding
      setMode('onboarding')
      checkPendingInvite()
    }
    setLoading(false)
  }

  const checkPendingInvite = async () => {
    const { data } = await supabase.rpc('check_pending_invite')
    if (data) setPendingInvite(data as PendingInvite)
  }

  const handleAcceptInvite = async () => {
    setLoading(true); setError('')
    const { error: rpcError } = await supabase.rpc('accept_invite', {
      p_display_name: ownerName.trim() || null,
    })
    if (rpcError) {
      if (rpcError.message.includes('já possui uma conta')) {
        navigate('/', { replace: true })
      } else {
        setError(rpcError.message)
      }
      setLoading(false)
      return
    }
    navigate('/', { replace: true })
    setLoading(false)
  }

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const { data, error: rpcError } = await supabase.rpc('provision_tenant', {
      p_tenant_name: tenantName.trim(),
      p_owner_name: ownerName.trim() || null,
    })

    if (rpcError) {
      if (rpcError.message.includes('já possui uma conta')) {
        navigate('/', { replace: true })
      } else {
        setError(rpcError.message)
      }
      setLoading(false)
      return
    }

    if (data) {
      navigate('/', { replace: true })
    }
    setLoading(false)
  }

  if (mode === 'onboarding') {
    return (
      <div className="auth">
        <div className="auth-card">
          <div className="auth-brand">
            <h1>🔮 SGT</h1>
            <p className="auth-subtitle">
              {pendingInvite ? 'Você foi convidado!' : 'Configure seu consultório'}
            </p>
          </div>

          {pendingInvite ? (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                Você foi convidado para o consultório <strong>{pendingInvite.tenant_name}</strong> como <strong>{pendingInvite.role_name}</strong>.
              </p>
              <div className="auth-field">
                <label>Seu nome</label>
                <input
                  type="text"
                  placeholder="Ex: Ana Paula"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button className="auth-btn-primary" onClick={handleAcceptInvite} disabled={loading}>
                {loading ? 'Entrando...' : 'Aceitar convite'}
              </button>
              <button type="button" className="auth-btn-link" onClick={() => setPendingInvite(null)}>
                Criar meu próprio consultório
              </button>
            </>
          ) : (
            <form onSubmit={handleOnboarding}>
              <div className="auth-field">
                <label>Nome do consultório</label>
                <input
                  type="text"
                  placeholder="Ex: Espaço Luz Interior"
                  value={tenantName}
                  onChange={e => setTenantName(e.target.value)}
                  required
                  minLength={3}
                  autoFocus
                />
              </div>
              <div className="auth-field">
                <label>Seu nome</label>
                <input
                  type="text"
                  placeholder="Ex: Maria Silva"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="auth-btn-primary" disabled={loading || !tenantName.trim()}>
                {loading ? 'Criando...' : 'Criar consultório'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>🔮 SGT</h1>
          <p className="auth-subtitle">Sistema de Gestão Terapêutica</p>
        </div>
        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Seu nome</label>
              <input
                type="text"
                placeholder="Ex: Maria Silva"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
              />
            </div>
          )}
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
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Nome do consultório</label>
              <input
                type="text"
                placeholder="Ex: Espaço Luz Interior"
                value={tenantName}
                onChange={e => setTenantName(e.target.value)}
                required
                minLength={3}
              />
            </div>
          )}
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
