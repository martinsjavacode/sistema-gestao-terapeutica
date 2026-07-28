import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchTemplates, fetchTemplate, insertTemplate, updateTemplate, deleteTemplate, duplicateTemplate } from '../../services/templates'
import { supabase } from '../../lib/supabase'

describe('templates service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('fetchTemplates', () => {
    it('fetches active templates ordered by usage', async () => {
      const orderNameMock = vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Limpeza Chakras' }], error: null })
      const orderUsageMock = vi.fn().mockReturnValue({ order: orderNameMock })
      const eqMock = vi.fn().mockReturnValue({ order: orderUsageMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      } as never)

      const { data } = await fetchTemplates()
      expect(supabase.from).toHaveBeenCalledWith('session_templates')
      expect(eqMock).toHaveBeenCalledWith('active', true)
      expect(data).toHaveLength(1)
    })

    it('filters by therapy type when provided', async () => {
      const orderNameMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const orderUsageMock = vi.fn().mockReturnValue({ order: orderNameMock })
      const eqTherapyMock = vi.fn().mockReturnValue({ order: orderUsageMock })
      const eqActiveMock = vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ eq: eqTherapyMock }) }) })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqActiveMock }),
      } as never)

      await fetchTemplates('radiestesia')
      expect(supabase.from).toHaveBeenCalledWith('session_templates')
    })
  })

  describe('fetchTemplate', () => {
    it('fetches single template by id', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: { id: '1', name: 'Test' }, error: null })
      const eqMock = vi.fn().mockReturnValue({ single: singleMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      } as never)

      const { data } = await fetchTemplate('1')
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(data?.name).toBe('Test')
    })
  })

  describe('insertTemplate', () => {
    it('inserts template with sections', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new', name: 'Novo' }, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)

      const sections = [{ id: 's1', template_id: '', type: 'builtin' as const, builtin_key: 'assessment', label: 'Avaliação Energética', display_order: 1, groups: [] }]
      const { data } = await insertTemplate({ name: 'Novo', therapy_type: 'radiestesia', sections })
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novo' }))
      expect(data?.name).toBe('Novo')
    })
  })

  describe('updateTemplate', () => {
    it('updates by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never)

      const { error } = await updateTemplate('1', { name: 'Renomeado' })
      expect(updateMock).toHaveBeenCalledWith({ name: 'Renomeado' })
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(error).toBeNull()
    })
  })

  describe('deleteTemplate', () => {
    it('soft deletes by setting active to false', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never)

      const { error } = await deleteTemplate('1')
      expect(updateMock).toHaveBeenCalledWith({ active: false })
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(error).toBeNull()
    })
  })

  describe('duplicateTemplate', () => {
    it('fetches original and inserts copy', async () => {
      // Mock fetchTemplate
      const singleFetchMock = vi.fn().mockResolvedValue({
        data: { id: '1', name: 'Original', description: 'Desc', therapy_type: 'radiestesia', sections: [] },
        error: null,
      })
      const eqFetchMock = vi.fn().mockReturnValue({ single: singleFetchMock })

      // Mock insertTemplate
      const singleInsertMock = vi.fn().mockResolvedValue({ data: { id: '2', name: 'Original (cópia)' }, error: null })
      const selectInsertMock = vi.fn().mockReturnValue({ single: singleInsertMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectInsertMock })

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) return { select: vi.fn().mockReturnValue({ eq: eqFetchMock }) } as never
        return { insert: insertMock } as never
      })

      const { data } = await duplicateTemplate('1')
      expect(data?.name).toBe('Original (cópia)')
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Original (cópia)' }))
    })

    it('returns error when original not found', async () => {
      const singleFetchMock = vi.fn().mockResolvedValue({ data: null, error: null })
      const eqFetchMock = vi.fn().mockReturnValue({ single: singleFetchMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqFetchMock }),
      } as never)

      const { data, error } = await duplicateTemplate('nonexistent')
      expect(data).toBeNull()
      expect(error).not.toBeNull()
    })
  })
})
