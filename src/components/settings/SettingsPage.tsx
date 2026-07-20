import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../hooks'
import { fetchTenantTechniques, fetchActiveTechniques, swapTechnique } from '../../services/techniques'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import SnippetsManager from '../ui/SnippetsManager'
import { toast } from '../../lib/toast'
import { confirm } from '../../lib/confirm'
import { Plus, UserPlus, User, Building2, Save, Bookmark, Sparkles, RefreshCw, Lock } from 'lucide-react'

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

type SettingsTab = 'account' | 'clinic' | 'snippets'

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
        <button
          className={`tab-nav-btn ${tab === 'snippets' ? 'active' : ''}`}
          onClick={() => setTab('snippets')}
        >
          <Bookmark size={14} /> Snippets
        </button>
      </div>

      {tab === 'account' && <AccountTab />}
      {tab === 'clinic' && <ClinicTab />}
      {tab === 'snippets' && <SnippetsManager />}
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
      <TechniquesSection />
      <TeamSection />
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
// Seção: Técnicas Ativas
// ============================================================

function TechniquesSection() {
  const { tenant, plan, refresh } = useTenant()
  const qc = useQueryClient()
  const [swapping, setSwapping] = useState(false)
  const [selectedNewTechnique, setSelectedNewTechnique] = useState('')
  const [swapTarget, setSwapTarget] = useState<string | null>(null)

  const { data: tenantTechniques = [] } = useQuery({
    queryKey: ['tenant-techniques-settings'],
    queryFn: async () => { const { data } = await fetchTenantTechniques(); return data },
  })

  const { data: allTechniques = [] } = useQuery({
    queryKey: ['all-techniques-catalog'],
    queryFn: async () => { const { data } = await fetchActiveTechniques(); return data },
  })

  const swapMut = useMutation({
    mutationFn: async ({ oldId, newId }: { oldId: string; newId: string }) => {
      const { error } = await swapTechnique(oldId, newId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-techniques-settings'] })
      refresh()
      toast('Técnica trocada com sucesso!')
      setSwapping(false)
      setSwapTarget(null)
      setSelectedNewTechnique('')
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const handleSwap = async (oldTechniqueId: string) => {
    if (!selectedNewTechnique) { toast('Selecione a nova técnica', 'error'); return }
    const confirmed = await confirm(`Trocar técnica? Esta ação só pode ser feita 1 vez.`)
    if (confirmed) {
      swapMut.mutate({ oldId: oldTechniqueId, newId: selectedNewTechnique })
    }
  }

  const isFree = tenant?.plan_id === 'free'
  const isEnterprise = tenant?.plan_id === 'enterprise'
  const maxTechniques = plan?.max_techniques ?? 1
  const currentCount = tenantTechniques.length

  // Técnicas disponíveis para troca (que o tenant ainda não tem)
  const availableForSwap = allTechniques.filter(
    t => !tenantTechniques.some(tt => tt.technique_id === t.id)
  )

  const getSwapStatus = (tt: { swapped_at: string | null; activated_at: string; is_addon: boolean }) => {
    if (tt.is_addon) return null
    if (tt.swapped_at) return { canSwap: false, message: `Trocada em ${new Date(tt.swapped_at).toLocaleDateString('pt-BR')}` }
    const activatedDate = new Date(tt.activated_at)
    const eligibleDate = new Date(activatedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = new Date()
    if (now < eligibleDate) {
      return { canSwap: false, message: `Troca disponível em ${eligibleDate.toLocaleDateString('pt-BR')}` }
    }
    return { canSwap: true, message: '1 troca disponível' }
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Sparkles size={18} /> Técnicas
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {isEnterprise ? 'Todas inclusas' : `${currentCount}/${maxTechniques === -1 ? '∞' : maxTechniques} no plano`}
        </span>
      </div>

      {/* Lista de técnicas ativas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {tenantTechniques.map(tt => {
          const swapStatus = isFree ? getSwapStatus(tt) : null

          return (
            <div
              key={tt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{tt.technique.name}</span>
                {tt.is_addon && (
                  <span className="badge badge-info" style={{ marginLeft: 'var(--space-2)', fontSize: '0.65rem' }}>Addon</span>
                )}
                {tt.technique.description && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {tt.technique.description}
                  </p>
                )}
                {swapStatus && (
                  <p style={{ fontSize: '0.72rem', color: swapStatus.canSwap ? 'var(--primary)' : 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    {swapStatus.canSwap ? `✓ ${swapStatus.message}` : `🕐 ${swapStatus.message}`}
                  </p>
                )}
              </div>

              {/* Botão trocar (apenas Free, 1 troca, após carência) */}
              {isFree && swapStatus?.canSwap && availableForSwap.length > 0 && (
                <Button
                  variant="tab"
                  onClick={() => { setSwapTarget(tt.technique_id); setSwapping(true) }}
                  style={{ fontSize: '0.78rem' }}
                >
                  <RefreshCw size={12} /> Trocar
                </Button>
              )}

              {/* Info para quem já trocou */}
              {isFree && tt.swapped_at && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={10} /> Troca utilizada
                </span>
              )}
            </div>
          )
        })}

        {tenantTechniques.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 'var(--space-4)' }}>
            Nenhuma técnica ativa. Entre em contato com o suporte.
          </p>
        )}
      </div>

      {/* Info de upgrade */}
      {isFree && !isEnterprise && (
        <div style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--border)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          💡 Quer mais técnicas? Faça upgrade para o plano <strong>Profissional</strong> (4 técnicas inclusas) ou adicione técnicas avulsas por R$ {((plan?.addon_price_cents ?? 1590) / 100).toFixed(2).replace('.', ',')}/mês.
        </div>
      )}

      {/* Modal de troca */}
      {swapping && swapTarget && (
        <div className="modal-overlay" onClick={() => { setSwapping(false); setSwapTarget(null) }} role="dialog" aria-modal="true" aria-label="Trocar técnica">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Trocar Técnica</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Você pode trocar sua técnica <strong>1 única vez</strong>. Após a troca, não será possível reverter.
            </p>

            <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Técnica atual</span>
              <span style={{ fontWeight: 600 }}>
                {tenantTechniques.find(tt => tt.technique_id === swapTarget)?.technique.name}
              </span>
            </div>

            <Select
              label="Nova técnica"
              value={selectedNewTechnique}
              onChange={setSelectedNewTechnique}
              placeholder="Selecione a técnica desejada"
              options={availableForSwap.map(t => ({ value: t.id, label: t.name }))}
            />

            <div className="form-actions" style={{ marginTop: 'var(--space-4)' }}>
              <Button variant="tab" onClick={() => { setSwapping(false); setSwapTarget(null) }}>Cancelar</Button>
              <Button
                onClick={() => handleSwap(swapTarget)}
                disabled={!selectedNewTechnique || swapMut.isPending}
              >
                <RefreshCw size={14} /> {swapMut.isPending ? 'Trocando...' : 'Confirmar troca'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Seção: Equipe (colaboradores na tabela users)
// ============================================================

function TeamSection() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
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

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name ?? '—'

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
      toast('Colaborador adicionado')
      setAdding(false)
      setNewName('')
      setNewEmail('')
      setNewRoleId('')
    },
    onError: (err: Error) => toast(err.message || 'Erro ao adicionar', 'error'),
  })

  const toggleUser = useMutation({
    mutationFn: async ({ id, activated }: { id: string; activated: boolean }) => {
      const { error } = await supabase.from('users').update({ activated: !activated }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] })
      toast('Status atualizado')
    },
    onError: () => toast('Erro ao atualizar status', 'error'),
  })

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    active: { label: 'Ativo', className: 'badge badge-success' },
    inactive: { label: 'Inativo', className: 'badge badge-danger' },
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Equipe</h2>
        <Button onClick={() => setAdding(true)}><UserPlus size={16} /> Adicionar</Button>
      </div>

      {users.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const status = u.activated ? 'active' : 'inactive'
              return (
                <tr key={u.id}>
                  <td>{u.display_name}</td>
                  <td>{u.email}</td>
                  <td>{getRoleName(u.role_id)}</td>
                  <td><button className={`${STATUS_BADGE[status]!.className} badge-toggle`} onClick={() => toggleUser.mutate({ id: u.id, activated: u.activated })} title={u.activated ? 'Clique para desativar' : 'Clique para ativar'}>{STATUS_BADGE[status]!.label}</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: 'var(--space-4)' }}>
          Nenhum colaborador cadastrado.
        </p>
      )}

      {adding && (
        <div className="modal-overlay" onClick={() => setAdding(false)} role="dialog" aria-modal="true" aria-label="Adicionar colaborador">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Adicionar Colaborador</h2>
            <div className="form-grid">
              <Input label="Nome" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do colaborador" required />
              <Input label="Email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" required />
              <Select
                label="Role"
                value={newRoleId}
                onChange={setNewRoleId}
                placeholder="Selecione a role"
                options={roles.filter(r => r.name !== 'client').map(r => ({ value: r.id, label: r.name }))}
              />
            </div>
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 'var(--space-2)' }}>O que cada role pode fazer:</strong>
              <p style={{ margin: 0 }}><strong>Admin</strong> — Acesso total: gerencia clientes, atendimentos, relatórios, equipe e configurações.</p>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
              O colaborador poderá acessar o sistema ao criar uma conta com este email.
            </p>
            <div className="form-actions">
              <Button variant="tab" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button onClick={() => addUser.mutate()} disabled={!newName.trim() || !newEmail.trim() || !newRoleId}>
                <Plus size={16} /> Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
