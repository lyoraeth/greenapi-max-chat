import { describe, expect, it } from 'vitest'
import { formatDay, isSameDay } from '@/chat/time'

const seconds = (date: Date) => Math.floor(date.getTime() / 1000)
const now = new Date(2026, 9, 9, 15, 0)

describe('formatDay', () => {
  it.each([
    [new Date(2026, 9, 9, 0, 1), 'Сегодня'],
    [new Date(2026, 9, 8, 23, 59), 'Вчера'],
    [new Date(2026, 9, 7, 12, 0), '7 октября'],
    [new Date(2025, 11, 31, 12, 0), '31 декабря 2025 г.'],
  ])('labels %s as %s', (date, expected) => {
    expect(formatDay(seconds(date), now)).toBe(expected)
  })
})

describe('isSameDay', () => {
  it('compares calendar days, not 24 hour windows', () => {
    const lateEvening = seconds(new Date(2026, 9, 8, 23, 59))
    const afterMidnight = seconds(new Date(2026, 9, 9, 0, 1))

    expect(isSameDay(lateEvening, afterMidnight)).toBe(false)
    expect(isSameDay(afterMidnight, seconds(now))).toBe(true)
  })
})
