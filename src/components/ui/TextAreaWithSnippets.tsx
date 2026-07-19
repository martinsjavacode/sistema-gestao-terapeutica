import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchSnippets, fetchSnippets, incrementSnippetUsage, type SnippetCategory, type Snippet } from '../../services/snippets'
import { Bookmark, Save } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  category?: SnippetCategory
  /** Se true, mostra botão para salvar como snippet */
  allowSave?: boolean
  onSaveSnippet?: (text: string) => void
}

export default function TextAreaWithSnippets({
  value,
  onChange,
  placeholder,
  rows = 4,
  category,
  allowSave = true,
  onSaveSnippet,
}: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [slashPos, setSlashPos] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Fetch snippets based on search
  const { data: snippets = [] } = useQuery({
    queryKey: ['snippets-search', searchTerm, category],
    queryFn: async () => {
      if (searchTerm) {
        const { data } = await searchSnippets(searchTerm, category)
        return data
      }
      const { data } = await fetchSnippets(category)
      return data.slice(0, 8)
    },
    enabled: showPicker,
    staleTime: 5000,
  })

  const closePicker = useCallback(() => {
    setShowPicker(false)
    setSearchTerm('')
    setSlashPos(null)
    setSelectedIndex(0)
  }, [])

  const insertSnippet = useCallback((snippet: Snippet) => {
    if (slashPos === null) return
    const textarea = textareaRef.current
    if (!textarea) return

    const before = value.slice(0, slashPos)
    const after = value.slice(textarea.selectionStart)
    const newValue = before + snippet.content + after
    onChange(newValue)

    closePicker()

    // Increment usage
    incrementSnippetUsage(snippet.id).catch(() => {})

    // Set cursor after inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = slashPos + snippet.content.length
        textareaRef.current.selectionStart = pos
        textareaRef.current.selectionEnd = pos
        textareaRef.current.focus()
      }
    }, 0)
  }, [slashPos, value, onChange, closePicker])

  // Detect / trigger
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, snippets.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && snippets.length > 0) {
        e.preventDefault()
        insertSnippet(snippets[selectedIndex])
      } else if (e.key === 'Escape') {
        closePicker()
      }
    }
  }, [showPicker, snippets, selectedIndex, insertSnippet, closePicker])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Check if user just typed /
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newValue.slice(0, cursorPos)

    // Find the last / that's either at start or after a space/newline
    const lastSlash = textBeforeCursor.lastIndexOf('/')
    if (lastSlash >= 0 && (lastSlash === 0 || /[\s\n]/.test(textBeforeCursor[lastSlash - 1]))) {
      const term = textBeforeCursor.slice(lastSlash + 1)
      if (term.length <= 30 && !term.includes('\n')) {
        setSlashPos(lastSlash)
        setSearchTerm(term)
        setShowPicker(true)
        setSelectedIndex(0)
        return
      }
    }

    if (showPicker) {
      closePicker()
    }
  }, [onChange, showPicker, closePicker])

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        closePicker()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker, closePicker])

  const hasContent = value.trim().length > 0

  return (
    <div className="textarea-snippets-container">
      <div className="textarea-snippets-wrapper">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Digite / para inserir um snippet...'}
          rows={rows}
        />

        {/* Hint */}
        {!showPicker && !value && (
          <span className="textarea-snippets-hint">
            <Bookmark size={12} /> / para snippets
          </span>
        )}

        {/* Save as snippet button */}
        {allowSave && hasContent && onSaveSnippet && (
          <button
            className="textarea-snippets-save"
            onClick={() => onSaveSnippet(value)}
            title="Salvar como snippet"
          >
            <Save size={12} />
          </button>
        )}
      </div>

      {/* Snippet Picker Dropdown */}
      {showPicker && (
        <div className="snippet-picker" ref={pickerRef}>
          {snippets.length > 0 ? (
            <ul className="snippet-picker-list">
              {snippets.map((snippet, index) => (
                <li
                  key={snippet.id}
                  className={`snippet-picker-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => insertSnippet(snippet)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="snippet-picker-title">{snippet.title}</span>
                  <span className="snippet-picker-content">{snippet.content}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="snippet-picker-empty">
              {searchTerm ? `Nenhum snippet para "${searchTerm}"` : 'Nenhum snippet salvo'}
            </div>
          )}
          <div className="snippet-picker-footer">
            <span>↑↓ navegar</span>
            <span>↵ inserir</span>
            <span>esc fechar</span>
          </div>
        </div>
      )}
    </div>
  )
}
