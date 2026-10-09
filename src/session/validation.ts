// API: формат idInstance и apiTokenInstance не документирован. Нижние границы взяты
// по известным образцам (10–12 цифр и 50 символов).
const ID_INSTANCE_MIN_LENGTH = 10
const TOKEN_MIN_LENGTH = 32

/** Оставляет в номере инстанса только цифры. */
export function maskIdInstance(value: string): string {
  return value.replace(/\D/g, '')
}

/** Убирает из ключа все, кроме латиницы и цифр: пробелы и переносы попадают при копировании. */
export function maskToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '')
}

export function validateIdInstance(value: string): string | null {
  if (!value) return 'Укажите idInstance'
  if (value.length < ID_INSTANCE_MIN_LENGTH) {
    return `idInstance состоит минимум из ${ID_INSTANCE_MIN_LENGTH} цифр`
  }
  return null
}

export function validateToken(value: string): string | null {
  if (!value) return 'Укажите apiTokenInstance'
  if (value.length < TOKEN_MIN_LENGTH) {
    return `apiTokenInstance не короче ${TOKEN_MIN_LENGTH} символов`
  }
  return null
}

/** Проверяет необязательный адрес хоста API: пустое значение допустимо. */
export function validateApiUrl(value: string): string | null {
  if (!value) return null
  if (!URL.canParse(value) || new URL(value).protocol !== 'https:') {
    return 'Адрес должен начинаться с https://'
  }
  return null
}
