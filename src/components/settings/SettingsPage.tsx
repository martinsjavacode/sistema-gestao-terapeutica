import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import { toast } from '../../lib/toast'
import { confirm } from '../../lib/confirm'
import { Plus, Trash2, UserPlus } from 'lucide-react'

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

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Configurações</h1>
      </div>
      <UsersSection />
    </div>
  )
}

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
        <h2 style={{ fontSize: '1.1rem' }}>Usuários autorizados</h2>
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
