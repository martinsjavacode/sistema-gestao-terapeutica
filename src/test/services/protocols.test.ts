import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchProtocols, fetchProtocol, insertProtocol, updateProtocol, deleteProtocol, duplicateProtocol } from '../../services/protocols'
import { supabase } from '../../lib/supabase'

describe('protocols service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('fetchProtocols', () => {
    it('fetches active protocols ordered by usage', async () => {
      const orderNameMock = vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Limpeza Chakras' }], error: null })
      const orderUsageMock = vi.fn().mockReturnValue({ order: orderNameMock })
      const eqMock = vi.fn().mockReturnValue({ order: orderUsageMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      } as never)

      const { data } = await fetchProtocols()
      expect(supabase.from).toHaveBeenCalledWith('protocols')
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

      await fetchProtocols('radiestesia')
      expect(supabase.from).toHaveBeenCalledWith('protocols')
    })
  })

  describe('fetchProtocol', () => {
    it('fetches single protocol by id', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: { id: '1', name: 'Test' }, error: null })
      const eqMock = vi.fn().mockReturnValue({ single: singleMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      } as never)

      const { data } = await fetchProtocol('1')
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(data?.name).toBe('Test')
    })
  })

  describe('insertProtocol', () => {
    it('inserts protocol with steps', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new', name: 'Novo' }, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)

      const steps = [{ id: 's1', title: 'Etapa 1', description: '', order: 1 }]
      const { data } = await insertProtocol({ name: 'Novo', therapy_type: 'radiestesia', steps })
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Novo', steps }))
      expect(data?.name).toBe('Novo')
    })
  })

  describe('updateProtocol', () => {
    it('updates by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never)

      const { error } = await updateProtocol('1', { name: 'Renomeado' })
      expect(updateMock).toHaveBeenCalledWith({ name: 'Renomeado' })
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(error).toBeNull()
    })
  })

  describe('deleteProtocol', () => {
    it('soft deletes by setting active to false', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never)

      const { error } = await deleteProtocol('1')
      expect(updateMock).toHaveBeenCalledWith({ active: false })
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(error).toBeNull()
    })
  })

  describe('duplicateProtocol', () => {
    it('fetches original and inserts copy', async () => {
      // Mock fetchProtocol
      const singleFetchMock = vi.fn().mockResolvedValue({
        data: { id: '1', name: 'Original', description: 'Desc', therapy_type: 'radiestesia', steps: [] },
        error: null,
      })
      const eqFetchMock = vi.fn().mockReturnValue({ single: singleFetchMock })

      // Mock insertProtocol
      const singleInsertMock = vi.fn().mockResolvedValue({ data: { id: '2', name: 'Original (cópia)' }, error: null })
      const selectInsertMock = vi.fn().mockReturnValue({ single: singleInsertMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectInsertMock })

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) return { select: vi.fn().mockReturnValue({ eq: eqFetchMock }) } as never
        return { insert: insertMock } as never
      })

      const { data } = await duplicateProtocol('1')
      expect(data?.name).toBe('Original (cópia)')
      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Original (cópia)' }))
    })

    it('returns error when original not found', async () => {
      const singleFetchMock = vi.fn().mockResolvedValue({ data: null, error: null })
      const eqFetchMock = vi.fn().mockReturnValue({ single: singleFetchMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqFetchMock }),
      } as never)

      const { data, error } = await duplicateProtocol('nonexistent')
      expect(data).toBeNull()
      expect(error).not.toBeNull()
    })
  })
})
