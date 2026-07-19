import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchClients, fetchClient, insertClient, updateClient, deleteClient, searchClients } from '../../services/clients'
import { supabase } from '../../lib/supabase'

describe('clients service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('fetchClients', () => {
    it('queries clients with active filter and order by name', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Ana' }], error: null })
      const eqMock = vi.fn().mockReturnValue({ order: orderMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      } as never)

      const { data } = await fetchClients()
      expect(supabase.from).toHaveBeenCalledWith('clients')
      expect(eqMock).toHaveBeenCalledWith('active', true)
      expect(data).toHaveLength(1)
      expect(data[0]!.name).toBe('Ana')
    })

    it('returns empty array when data is null', async () => {
      const orderMock = vi.fn().mockResolvedValue({ data: null, error: null })
      const eqMock = vi.fn().mockReturnValue({ order: orderMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      } as never)

      const { data } = await fetchClients()
      expect(data).toEqual([])
    })
  })

  describe('fetchClient', () => {
    it('queries by id and returns single', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: { id: '1', name: 'Maria' }, error: null })
      const eqMock = vi.fn().mockReturnValue({ single: singleMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      } as never)

      const { data } = await fetchClient('1')
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(data?.name).toBe('Maria')
    })
  })

  describe('insertClient', () => {
    it('inserts with tenant_id', async () => {
      const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new', name: 'Joana' }, error: null })
      const selectMock = vi.fn().mockReturnValue({ single: singleMock })
      const insertMock = vi.fn().mockReturnValue({ select: selectMock })
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as never)

      const { data } = await insertClient({
        name: 'Joana', birth_date: '1990-01-01', cpf: null, sex: null,
        marital_status: null, profession: null, whatsapp: null, email: null,
        city: null, photo_url: null, notes: null,
      })

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Joana', tenant_id: 'mock-tenant-id' }))
      expect(data?.name).toBe('Joana')
    })
  })

  describe('updateClient', () => {
    it('updates by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never)

      const { error } = await updateClient('1', { name: 'Maria Atualizada' })
      expect(updateMock).toHaveBeenCalledWith({ name: 'Maria Atualizada' })
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(error).toBeNull()
    })
  })

  describe('deleteClient', () => {
    it('soft deletes by setting active to false', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null })
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never)

      const { error } = await deleteClient('1')
      expect(updateMock).toHaveBeenCalledWith({ active: false })
      expect(eqMock).toHaveBeenCalledWith('id', '1')
      expect(error).toBeNull()
    })
  })

  describe('searchClients', () => {
    it('searches with ilike on name', async () => {
      const limitMock = vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Maria' }], error: null })
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const ilikeMock = vi.fn().mockReturnValue({ order: orderMock })
      const eqMock = vi.fn().mockReturnValue({ ilike: ilikeMock })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqMock }),
      } as never)

      const { data } = await searchClients('mar')
      expect(ilikeMock).toHaveBeenCalledWith('name', '%mar%')
      expect(data).toHaveLength(1)
    })
  })
})
