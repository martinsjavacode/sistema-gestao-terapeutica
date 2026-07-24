/**
 * Shared input mask utilities — DRY extraction from multiple components.
 */

/** Máscara de telefone: (XX) XXXXX-XXXX */
export function maskPhone(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11)
  if (clean.length <= 2) return clean.length ? `(${clean}` : ''
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
}

/** Máscara de data: dd/mm/aaaa */
export function maskDate(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 8)
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`
}

/** Máscara de CPF: 000.000.000-00 */
export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

/** Converte dd/mm/yyyy para yyyy-mm-dd (ISO). Retorna null se inválido. */
export function parseDateBR(dateBR: string): string | null {
  const parts = dateBR.split('/')
  if (parts.length !== 3 || parts[2]!.length !== 4) return null
  const [day, month, year] = parts
  const d = new Date(`${year}-${month}-${day}`)
  if (isNaN(d.getTime())) return null
  return `${year}-${month}-${day}`
}
