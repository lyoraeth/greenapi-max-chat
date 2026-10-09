import type { Credentials } from '@/api/types'

const STORAGE_KEY = 'credentials'

/**
 * Выводит хост API из номера инстанса.
 *
 * @remarks
 * Первые четыре цифры `idInstance` совпадают с поддоменом хоста, выданного
 * инстансу в личном кабинете.
 *
 * API: правило в документации не описано и выведено из наблюдения. хост
 * положено брать из личного кабинета, поэтому в форме входа его можно задать явно.
 */
export function resolveApiUrl(idInstance: string): string {
  return `https://${idInstance.slice(0, 4)}.api.green-api.com`
}

/**
 * Читает параметры инстанса из переменных окружения для входа без формы.
 *
 * @remarks
 * Работает только в dev-режиме: в проде ветка вырезается!!
 */
export function envCredentials(): Credentials | null {
  if (!import.meta.env.DEV) return null

  const { VITE_ID_INSTANCE, VITE_API_TOKEN_INSTANCE, VITE_API_URL } = import.meta.env
  if (!VITE_ID_INSTANCE || !VITE_API_TOKEN_INSTANCE) return null
  return {
    idInstance: VITE_ID_INSTANCE,
    apiTokenInstance: VITE_API_TOKEN_INSTANCE,
    apiUrl: VITE_API_URL || resolveApiUrl(VITE_ID_INSTANCE),
  }
}

export function loadCredentials(): Credentials | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Credentials) : null
}

export function saveCredentials(credentials: Credentials): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials))
}

export function clearCredentials(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
