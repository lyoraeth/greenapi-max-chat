const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const dayWithYearFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const DAY_MS = 24 * 60 * 60 * 1000

/** Начало суток в часовом поясе пользователя, в мсах. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Форматирует Unix-время в секундах как `ЧЧ:ММ` в часовом поясе пользователя. */
export function formatTime(timestamp: number): string {
  return timeFormatter.format(timestamp * 1000)
}

/** Проверяет, что два Unix-времени в секундах приходятся на одни календарные сутки. */
export function isSameDay(a: number, b: number): boolean {
  return startOfDay(new Date(a * 1000)) === startOfDay(new Date(b * 1000))
}

/**
 * Подпись дня для разделителя в ленте сообщений.
 *
 * @param timestamp - Unix-время в секундах
 * @param now - текущий момент, задается в тестах
 */
export function formatDay(timestamp: number, now: Date = new Date()): string {
  const date = new Date(timestamp * 1000)
  // округление нужно из-за суток в 23 и 25 часов при переводе часов
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)

  if (daysAgo === 0) return 'Сегодня'
  if (daysAgo === 1) return 'Вчера'
  return date.getFullYear() === now.getFullYear()
    ? dayFormatter.format(date)
    : dayWithYearFormatter.format(date)
}
