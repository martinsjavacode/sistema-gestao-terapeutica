import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../hooks'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { toast } from '../../lib/toast'
import { confirm } from '../../lib/confirm'
import { Plus, Trash2, UserPlus, User, Building2, Save } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  display_name: string
  role_id: string
  activated: boolean
}

interface RoleRow {
  id: string
  name: string
  description: string | null
}

type SettingsTab = 'account' | 'clinic'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('clinic')

  return (
    <div>
      <div className="page-header">
        <h1>Configurações</h1>
      </div>

      <div className="tab-nav" style={{ marginBottom: 'var(--space-4)' }}>
        <button
          className={`tab-nav-btn ${tab === 'account' ? 'active' : ''}`}
          onClick={() => setTab('account')}
        >
          <User size={14} /> Minha Conta
        </button>
        <button
          className={`tab-nav-btn ${tab === 'clinic' ? 'active' : ''}`}
          onClick={() => setTab('clinic')}
        >
          <Building2 size={14} /> Consultório
        </button>
      </div>

      {tab === 'account' && <AccountTab />}
      {tab === 'clinic' && <ClinicTab />}
    </div>
  )
}

// ============================================================
// Aba: Minha Conta
// ============================================================

function AccountTab() {
  const [displayName, setDisplayName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loadingName, setLoadingName] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [nameLoaded, setNameLoaded] = useState(false)

  // Carregar nome atual
  useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const session = (await supabase.auth.getSession()).data.session
      if (!session) return null
      const { data } = await supabase
        .from('users')
        .select('display_name')
        .eq('email', session.user.email ?? '')
        .single()
      if (data && !nameLoaded) {
        setDisplayName(data.display_name)
        setNameLoaded(true)
      }
      return data
    },
  })

  const handleUpdateName = async () => {
    setLoadingName(true)
    const session = (await supabase.auth.getSession()).data.session
    if (!session) { setLoadingName(false); return }
    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName.trim() })
      .eq('email', session.user.email ?? '')
    if (error) toast('Erro ao atualizar nome', 'error')
    else toast('Nome atualizado')
    setLoadingName(false)
  }

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast('A senha deve ter pelo menos 6 caracteres', 'error')
      return
    }
    setLoadingPassword(true)
    // Supabase Auth: atualizar senha (não precisa da senha antiga se está logado)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) toast(error.message, 'error')
    else {
      toast('Senha atualizada')
      setCurrentPassword('')
      setNewPassword('')
    }
    setLoadingPassword(false)
  }

  return (
    <>
      <div className="card" style={{ marginTop: 'var(--space-2)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Perfil</h2>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Nome de exibição"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <Button onClick={handleUpdateName} disabled={loadingName || !displayName.trim()}>
            <Save size={14} /> {loadingName ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Alterar Senha</h2>
        <div className="form-grid">
          <Input
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button onClick={handleUpdatePassword} disabled={loadingPassword || !newPassword}>
            {loadingPassword ? 'Atualizando...' : 'Alterar senha'}
          </Button>
        </div>
      </div>
    </>
  )
}

// ============================================================
// Aba: Consultório
// ============================================================

function ClinicTab() {
  return (
    <>
      <ClinicInfoSection />
      <UsersSection />
      <InvitesSection />
    </>
  )
}

function ClinicInfoSection() {
  const { tenant, plan, refresh } = useTenant()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [nameLoaded, setNameLoaded] = useState(false)

  // Sync state quando tenant carrega
  if (tenant && !nameLoaded) {
    setName(tenant.name)
    setNameLoaded(true)
  }

  const handleSave = async () => {
    if (!tenant) return
    setLoading(true)
    // Gerar novo slug a partir do nome
    const { data: newSlug } = await supabase.rpc('generate_slug', { p_name: name.trim() })
    const { error } = await supabase
      .from('tenants')
      .update({ name: name.trim(), slug: newSlug ?? tenant.slug })
      .eq('id', tenant.id)
    if (error) toast('Erro ao atualizar', 'error')
    else {
      toast('Consultório atualizado')
      refresh()
    }
    setLoading(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenant) return

    if (file.size > 2 * 1024 * 1024) {
      toast('Imagem deve ter no máximo 2MB', 'error')
      return
    }

    setUploadingLogo(true)
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${tenant.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast('Erro ao enviar logo', 'error')
      setUploadingLogo(false)
      return
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)

    const { error: updateError } = await supabase
      .from('tenants')
      .update({ logo_url: urlData.publicUrl })
      .eq('id', tenant.id)

    if (updateError) toast('Erro ao salvar URL do logo', 'error')
    else {
      toast('Logo atualizado')
      refresh()
    }
    setUploadingLogo(false)
  }

  const handleRemoveLogo = async () => {
    if (!tenant) return
    setUploadingLogo(true)
    await supabase.from('tenants').update({ logo_url: null }).eq('id', tenant.id)
    toast('Logo removido')
    refresh()
    setUploadingLogo(false)
  }

  const PLAN_LABELS: Record<string, string> = {
    free: '🆓 Gratuito',
    pro: '⭐ Profissional',
    enterprise: '🏢 Clínica',
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-2)' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Dados do Consultório</h2>

      {/* Logo upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {tenant?.logo_url
            ? <img src={tenant.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '1.5rem' }}>🔮</span>
          }
        </div>
        <div>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} style={{ display: 'none' }} id="logo-upload" />
          <Button variant="tab" disabled={uploadingLogo} onClick={() => document.getElementById('logo-upload')?.click()}>
            {uploadingLogo ? 'Enviando...' : tenant?.logo_url ? 'Trocar logo' : 'Enviar logo'}
          </Button>
          {tenant?.logo_url && (
            <button onClick={handleRemoveLogo} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', marginLeft: 'var(--space-3)' }}>
              Remover
            </button>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>PNG, JPG ou WebP. Máx 2MB. Recomendado: 256×256px.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <div style={{ flex: 1 }}>
          <Input
            label="Nome do consultório"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Espaço Luz Interior"
          />
        </div>
        <Button onClick={handleSave} disabled={loading || !name.trim() || name === tenant?.name}>
          <Save size={14} /> {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
        <div style={{ padding: 'var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Plano</span>
          <span style={{ fontWeight: 600 }}>{PLAN_LABELS[tenant?.plan_id ?? 'free'] ?? tenant?.plan_id}</span>
        </div>
        <div style={{ padding: 'var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Slug</span>
          <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>{tenant?.slug ?? '—'}</span>
        </div>
        {plan && (
          <>
            <div style={{ padding: 'var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Limite de clientes</span>
              <span style={{ fontWeight: 600 }}>{plan.max_clients}</span>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Limite de usuários</span>
              <span style={{ fontWeight: 600 }}>{plan.max_users}</span>
            </div>
            <div style={{ padding: 'var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Atend./mês</span>
              <span style={{ fontWeight: 600 }}>{plan.max_attendances_month ?? 'Ilimitado'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Seção: Usuários do consultório
// ============================================================

function UsersSection() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRoleId, setNewRoleId] = useState('')

  const { data: users = [] } = useQuery<UserRow[]>({
    queryKey: ['settings-users'],
    queryFn: async () => {
      const { data } = await supabase.from('users').select('id, email, display_name, role_id, activated')
      return data ?? []
    },
  })

  const { data: roles = [] } = useQuery<RoleRow[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('id, name, description')
      return data ?? []
    },
  })

  const addUser = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('users').insert({
        email: newEmail.trim().toLowerCase(),
        display_name: newName.trim(),
        role_id: newRoleId,
        activated: false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] })
      toast('Usuário adicionado')
      setAdding(false)
      setNewEmail('')
      setNewName('')
      setNewRoleId('')
    },
    onError: (err: Error) => toast(err.message || 'Erro ao adicionar', 'error'),
  })

  const removeUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] })
      toast('Usuário removido')
    },
    onError: () => toast('Erro ao remover', 'error'),
  })

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? '—'

  return (
    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Equipe</h2>
        <Button onClick={() => setAdding(true)}><UserPlus size={16} /> Adicionar</Button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Nome</th>
            <th>Role</th>
            <th>Ativo</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.display_name}</td>
              <td>{getRoleName(u.role_id)}</td>
              <td>{u.activated ? '✓' : '—'}</td>
              <td className="actions">
                <Button
                  variant="icon"
                  onClick={async () => { if (await confirm(`Remover ${u.email}?`)) removeUser.mutate(u.id) }}
                  aria-label="Remover usuário"
                >
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-6)' }}>Nenhum usuário cadastrado</td></tr>
          )}
        </tbody>
      </table>

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)} role="dialog" aria-modal="true" aria-label="Adicionar usuário">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Adicionar Usuário</h2>
            <div className="form-grid">
              <Input label="Email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              <Input label="Nome" value={newName} onChange={e => setNewName(e.target.value)} required />
              <Select
                label="Role"
                value={newRoleId}
                onChange={setNewRoleId}
                placeholder="Selecione a role"
                options={roles.map(r => ({ value: r.id, label: r.name }))}
              />
            </div>
            <div className="form-actions">
              <Button variant="tab" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button onClick={() => addUser.mutate()} disabled={!newEmail.trim() || !newName.trim() || !newRoleId}>
                <Plus size={16} /> Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Seção: Convites pendentes
// ============================================================

function InvitesSection() {
  const qc = useQueryClient()
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')

  interface InviteRow {
    id: string
    email: string
    role_id: string
    accepted_at: string | null
    created_at: string
  }

  const { data: invites = [] } = useQuery<InviteRow[]>({
    queryKey: ['settings-invites'],
    queryFn: async () => {
      const { data } = await supabase.from('invites').select('id, email, role_id, accepted_at, created_at').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: roles = [] } = useQuery<RoleRow[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('id, name, description')
      return data ?? []
    },
  })

  const sendInvite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('invites').insert({
        email: inviteEmail.trim().toLowerCase(),
        role_id: inviteRoleId,
        tenant_id: (await supabase.rpc('current_tenant_id')).data,
        invited_by: (await supabase.from('users').select('id').eq('email', (await supabase.auth.getSession()).data.session?.user.email ?? '').single()).data?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-invites'] })
      toast('Convite enviado')
      setInviting(false)
      setInviteEmail('')
      setInviteRoleId('')
    },
    onError: (err: Error) => {
      const msg = err.message.includes('duplicate') ? 'Já existe um convite para este email' : err.message
      toast(msg, 'error')
    },
  })

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invites').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-invites'] })
      toast('Convite revogado')
    },
    onError: () => toast('Erro ao revogar', 'error'),
  })

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? '—'
  const pendingInvites = invites.filter(i => !i.accepted_at)

  return (
    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Convites pendentes</h2>
        <Button onClick={() => setInviting(true)}><Plus size={16} /> Convidar</Button>
      </div>

      {pendingInvites.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Enviado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pendingInvites.map(i => (
              <tr key={i.id}>
                <td>{i.email}</td>
                <td>{getRoleName(i.role_id)}</td>
                <td>{new Date(i.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="actions">
                  <Button
                    variant="icon"
                    onClick={async () => { if (await confirm(`Revogar convite de ${i.email}?`)) revokeInvite.mutate(i.id) }}
                    aria-label="Revogar convite"
                  >
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: 'var(--space-4)' }}>
          Nenhum convite pendente. Convide colaboradores para trabalhar com você.
        </p>
      )}

      {inviting && (
        <div className="modal-overlay" onClick={() => setInviting(false)} role="dialog" aria-modal="true" aria-label="Convidar colaborador">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Convidar Colaborador</h2>
            <div className="form-grid">
              <Input label="Email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
              <Select
                label="Role"
                value={inviteRoleId}
                onChange={setInviteRoleId}
                placeholder="Selecione a role"
                options={roles.map(r => ({ value: r.id, label: r.name }))}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
              O colaborador receberá acesso ao criar uma conta com este email.
            </p>
            <div className="form-actions">
              <Button variant="tab" onClick={() => setInviting(false)}>Cancelar</Button>
              <Button onClick={() => sendInvite.mutate()} disabled={!inviteEmail.trim() || !inviteRoleId}>
                <Plus size={16} /> Enviar convite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
