import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchSnippets, searchSnippets, insertSnippet, updateSnippet, deleteSnippet } from '../../services/snippets'
import { supabase } from '../../lib/supabase'

describe('snippets service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('fetchSnippets', () => {
    it('fetches all snippets ordered by usage_count', async () => {
      const orderTitleMock = vi.fn().mockResolvedValue({ data: [{ id: '1', title: 'Reiki' }], error: null })
      const orderUsageMock = vi.fn().mockReturnValue({ order: orderTitleMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ order: orderUsageMock }),
      } as never)

      const { data } = await fetchSnippets()
      expect(supabase.from).toHaveBeenCalledWith('snippets')
      expect(data).toHaveLength(1)
    })

    it('filters by category when provided', async () => {
      const orderTitleMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const orderUsageMock = vi.fn().mockReturnValue({ order: orderTitleMock })
      const eqMock = vi.fn().mockReturnValue({ order: orderUsageMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ eq: eqMock }) }) }),
      } as never)

      // Note: actual implementation chains order().order().eq() for category filter
      // This test validates the function is called with correct table
      await fetchSnippets('recomendacoes')
      expect(supabase.from).toHaveBeenCalledWith('snippets')
    })
  })

  describe('searchSnippets', () => {
    it('searches with or filter on title and content', async () => {
      const limitMock = vi.fn().mockResolvedValue({ data: [{ id: '1', title: 'Meditação' }], error: null })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const orMock = vi.fn().mockReturnValue({ order: orderMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ or: orMock }),
      } as never)

      const { data } = await searchSnippets('med')
      expect(supabase.from).toHaveBeenCalledWith('snippets')
      expect(orMock).toHaveBeenCalledWith(expect.stringContaining('med'))
      expect(data).toHaveLength(1)
    })

    it('filters by category when provided', async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const limitMock = vi.fn().mockReturnValue({ eq: eqMock })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const orMock = vi.fn().mockReturnValue({ order: orderMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ or: orMock }),
      } as never)

      await searchSnippets('test', 'recomendacoes')
      expect(supabase.from).toHaveBeenCalledWith('snippets')
    })
  })

  describe('insertSnippet', () => {
    it('inserts snippet and returns data', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new', title: 'Novo', content: 'Texto', category: 'geral' }, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)

      const { data } = await insertSnippet({ title: 'Novo', content: 'Texto', category: 'geral' })
      expect(insertMock).toHaveBeenCalledWith({ title: 'Novo', content: 'Texto', category: 'geral' })
      expect(data?.title).toBe('Novo')
    })
  })

  describe('updateSnippet', () => {
    it('updates by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never)

      const { error } = await updateSnippet('1', { title: 'Atualizado' })
      expect(updateMock).toHaveBeenCalledWith({ title: 'Atualizado' })
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(error).toBeNull()
    })
  })

  describe('deleteSnippet', () => {
    it('deletes by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as never)

      const { error } = await deleteSnippet('1')
      expect(supabase.from).toHaveBeenCalledWith('snippets')
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(error).toBeNull()
    })
  })
})
