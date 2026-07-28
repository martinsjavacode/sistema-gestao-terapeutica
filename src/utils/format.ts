/**
 * Shared formatting utilities — DRY extraction from multiple components.
 */

/** Formata ISO date (yyyy-mm-dd) para pt-BR: dd/mm/yyyy */
export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

/** Calcula a idade a partir de uma data de nascimento ISO (yyyy-mm-dd). */
export function calcAge(birthDate: string): number {
  const birth = new Date(birthDate + 'T12:00:00')
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

/** Formata centavos para moeda BRL: R$ 1.234,56 */
export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
