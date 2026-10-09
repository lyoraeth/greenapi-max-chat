import type { GreenApiClient } from '@/api/client'
import type { NotificationBody } from '@/api/types'

// API: допустимо от 5 до 60 секунд; ответ приходит сразу, как только в очереди
// появляется уведомление, так что значение влияет только на частоту пустых запросов
const RECEIVE_TIMEOUT_SECONDS = 20
const RETRY_DELAY_MS = 3000

export interface PollingOptions {
  signal: AbortSignal
  onNotification: (body: NotificationBody) => void
  /** Вызывается после каждого успешного запроса, в том числе при пустой очереди. */
  onSuccess?: () => void
  onError: (error: unknown) => void
  retryDelayMs?: number
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

/**
 * Вычитывает очередь уведомлений инстанса, пока не сработает `signal`.
 *
 * @remarks
 * Уведомление удаляется из очереди только после обработки: при обрыве между
 * получением и удалением оно придет повторно.
 *
 * API: очередь у инстанса одна и общая для всех клиентов - вторая вкладка или
 * другой сервис, читающие ее же, заберут часть уведомлений. В очередь попадают
 * уведомления всех включенных типов, и удалять нужно каждое, иначе следующее
 * не будет выдано.
 */
export async function pollNotifications(
  client: Pick<GreenApiClient, 'receiveNotification' | 'deleteNotification'>,
  { signal, onNotification, onSuccess, onError, retryDelayMs = RETRY_DELAY_MS }: PollingOptions,
): Promise<void> {
  while (!signal.aborted) {
    try {
      const notification = await client.receiveNotification(RECEIVE_TIMEOUT_SECONDS, signal)
      onSuccess?.()
      if (!notification) continue
      onNotification(notification.body)
      await client.deleteNotification(notification.receiptId)
    } catch (error) {
      if (signal.aborted) return
      onError(error)
      await delay(retryDelayMs, signal)
    }
  }
}
