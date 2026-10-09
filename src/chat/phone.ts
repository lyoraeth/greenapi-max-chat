const RU_GROUPS = [1, 3, 3, 2, 2]
const BY_GROUPS = [3, 2, 3, 2, 2]
const SEPARATORS = ['', ' ', ' ', '-', '-']

/** Оставляет цифры и приводит российский номер к виду с кодом 7. */
function toDigits(input: string): string {
  const digits = input.replace(/\D/g, '')
  // 8 999 … и 999 … - внутрироссийские записи того же номера
  if (digits.startsWith('8')) return `7${digits.slice(1)}`
  if (digits.startsWith('9')) return `7${digits}`
  return digits
}

/**
 * Форматирует номер по мере ввода: `+7 999 123-45-67` или `+375 29 123-45-67`.
 *
 * @remarks
 * Лишние цифры сверх длины номера отбрасываются.
 */
export function maskPhone(input: string): string {
  const digits = toDigits(input)
  if (!digits) return input.includes('+') ? '+' : ''

  const groups = digits.startsWith('375') ? BY_GROUPS : RU_GROUPS
  let masked = '+'
  let offset = 0
  groups.forEach((size, index) => {
    const part = digits.slice(offset, offset + size)
    if (part) masked += SEPARATORS[index] + part
    offset += size
  })
  return masked
}

/**
 * Приводит введенный номер к международному формату без `+`.
 *
 * @returns номер из цифр либо `null`, если это не номер РФ (7) или РБ (375):
 * другие коды API не принимает
 *
 * API: ограничение на коды стран - у метода checkAccount, длина номера 11 или 12 цифр.
 */
export function normalizePhone(input: string): string | null {
  const digits = toDigits(input)
  if (digits.length === 11 && digits.startsWith('7')) return digits
  if (digits.length === 12 && digits.startsWith('375')) return digits
  return null
}
