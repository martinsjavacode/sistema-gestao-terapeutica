/**
 * Shared date utilities — DRY extraction from multiple components.
 */

/** Gera os dias do calendário mensal (35 ou 42 dias, começando no domingo). */
export function getCalendarDays(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const calStart = new Date(start)
  calStart.setDate(calStart.getDate() - calStart.getDay())

  const days: Date[] = []
  const current = new Date(calStart)
  while (days.length < 42) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  const lastWeekStart = days[35]
  if (lastWeekStart && lastWeekStart.getMonth() !== month.getMonth()) {
    days.splice(35, 7)
  }
  return days
}

/** Verifica se duas datas representam o mesmo dia. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Retorna o range (start, end) da semana que contém a data dada (domingo a sábado). */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** Retorna o range (start, end) do mês completo. */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** Label formatado para range de semana: "1 de jan. — 7 de jan." */
export function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('pt-BR', opts)} — ${end.toLocaleDateString('pt-BR', opts)}`
}

/** Label formatado para mês: "janeiro de 2026" */
export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
