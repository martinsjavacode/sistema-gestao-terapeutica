import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSnippets, insertSnippet, updateSnippet, deleteSnippet, SNIPPET_CATEGORIES, type SnippetCategory, type Snippet } from '../../services/snippets'
import Button from './Button'
import Modal from './Modal'
import EmptyState from './EmptyState'
import { confirm } from '../../lib/confirm'
import { toast } from '../../lib/toast'
import { Plus, Pencil, Trash2, Bookmark, Hash } from 'lucide-react'

export default function SnippetsManager() {
  const qc = useQueryClient()
  const [filterCategory, setFilterCategory] = useState<SnippetCategory | 'all'>('all')
  const [editing, setEditing] = useState<Snippet | null>(null)
  const [adding, setAdding] = useState(false)

  const { data: snippets = [], isLoading } = useQuery({
    queryKey: ['snippets', filterCategory],
    queryFn: async () => {
      const { data } = await fetchSnippets(filterCategory === 'all' ? undefined : filterCategory)
      return data
    },
  })

  const handleDelete = async (snippet: Snippet) => {
    if (await confirm(`Excluir snippet "${snippet.title}"?`)) {
      const { error } = await deleteSnippet(snippet.id)
      if (error) toast('Erro ao excluir', 'error')
      else { toast('Snippet excluído'); qc.invalidateQueries({ queryKey: ['snippets'] }) }
    }
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem' }}>Snippets</h2>
          <p className="page-subtitle">Trechos reutilizáveis para preenchimento rápido</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus size={16} /> Novo snippet</Button>
      </div>

      {/* Filtros por categoria */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <button
          className={`tab-nav-btn ${filterCategory === 'all' ? 'active' : ''}`}
          onClick={() => setFilterCategory('all')}
          style={{ fontSize: '0.78rem', padding: '6px 12px' }}
        >
          Todos ({snippets.length})
        </button>
        {(Object.entries(SNIPPET_CATEGORIES) as [SnippetCategory, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`tab-nav-btn ${filterCategory === key ? 'active' : ''}`}
            onClick={() => setFilterCategory(key)}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      ) : snippets.length === 0 ? (
        <EmptyState
          icon="generic"
          title="Nenhum snippet"
          description="Crie snippets para agilizar o preenchimento de atendimentos. Digite / nos campos de texto para inserir rapidamente."
          actionLabel="Criar primeiro snippet"
          onAction={() => setAdding(true)}
        />
      ) : (
        <div className="snippets-grid">
          {snippets.map(snippet => (
            <div key={snippet.id} className="snippet-card">
              <div className="snippet-card-header">
                <div className="snippet-card-title">
                  <Bookmark size={14} className="snippet-card-icon" />
                  <span>{snippet.title}</span>
                </div>
                <div className="snippet-card-actions">
                  <button className="edit-btn" onClick={() => setEditing(snippet)} aria-label="Editar"><Pencil size={14} /></button>
                  <button className="edit-btn" onClick={() => handleDelete(snippet)} aria-label="Excluir"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="snippet-card-content">{snippet.content}</p>
              <div className="snippet-card-footer">
                <span className="badge badge-info">{SNIPPET_CATEGORIES[snippet.category as SnippetCategory] ?? snippet.category}</span>
                {snippet.usage_count > 0 && (
                  <span className="snippet-card-usage"><Hash size={10} /> {snippet.usage_count}x usado</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      {(adding || editing) && (
        <SnippetForm
          snippet={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ['snippets'] }) }}
        />
      )}
    </div>
  )
}

// ========== Formulário de Snippet ==========

function SnippetForm({ snippet, onClose, onSaved }: { snippet: Snippet | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(snippet?.title ?? '')
  const [content, setContent] = useState(snippet?.content ?? '')
  const [category, setCategory] = useState<SnippetCategory>(snippet?.category as SnippetCategory ?? 'geral')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    if (snippet) {
      const { error } = await updateSnippet(snippet.id, { title: title.trim(), content: content.trim(), category })
      if (error) { toast('Erro ao atualizar', 'error'); return }
      toast('Snippet atualizado')
    } else {
      const { error } = await insertSnippet({ title: title.trim(), content: content.trim(), category })
      if (error) { toast('Erro ao criar', 'error'); return }
      toast('Snippet criado')
    }
    onSaved()
  }

  return (
    <Modal
      title={snippet ? 'Editar Snippet' : 'Novo Snippet'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={snippet ? 'Salvar' : 'Criar'}
      submitDisabled={!title.trim() || !content.trim()}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <label className="form-label">
          Título (atalho de busca)
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Meditação diária"
            autoFocus
          />
        </label>

        <label className="form-label">
          Categoria
          <select value={category} onChange={e => setCategory(e.target.value as SnippetCategory)}>
            {(Object.entries(SNIPPET_CATEGORIES) as [SnippetCategory, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>

        <label className="form-label">
          Conteúdo
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Texto que será inserido ao selecionar este snippet..."
            rows={4}
          />
        </label>
      </div>
    </Modal>
  )
}
