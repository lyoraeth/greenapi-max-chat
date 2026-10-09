import { useEffect, useState } from 'react'
import type { GreenApiClient } from '@/api/client'
import { errorMessage } from '@/api/errorMessage'
import { Button } from '@/components/ui/button'

// API: getSettings почему-то изредка отвечает 200 с пустым телом, поэтому проверка повторяется
const CHECK_RETRIES = 3
const CHECK_RETRY_DELAY_MS = 3000

type Status = 'unknown' | 'disabled' | 'enabling' | 'applying'

interface NotificationsNoticeProps {
  client: GreenApiClient
}

/** Предупреждает, что в настройках инстанса выключены нужные уведомления, предлагает их включить. */
export function NotificationsNotice({ client }: NotificationsNoticeProps) {
  const [status, setStatus] = useState<Status>('unknown')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isStale = false
    let timer: ReturnType<typeof setTimeout>

    async function check(attemptsLeft: number) {
      try {
        const enabled = await client.areNotificationsEnabled()
        if (!isStale && !enabled) setStatus('disabled')
      } catch {
        // о недоступности API сообщает опрос очереди, здесь ток повторяем проверку
        if (!isStale && attemptsLeft > 0) {
          timer = setTimeout(() => void check(attemptsLeft - 1), CHECK_RETRY_DELAY_MS)
        }
      }
    }

    void check(CHECK_RETRIES)
    return () => {
      isStale = true
      clearTimeout(timer)
    }
  }, [client])

  async function enable() {
    setError(null)
    setStatus('enabling')
    try {
      await client.enableNotifications()
      setStatus('applying')
    } catch (cause) {
      setError(errorMessage(cause))
      setStatus('disabled')
    }
  }

  if (status === 'unknown') return null

  return (
    <div role="status" className="flex items-center gap-3 bg-card px-4 py-2.5 text-[13px]/4">
      {status === 'applying' ? (
        <p className="flex-1">
          Настройки сохранены. Инстанс перезапускается, уведомления начнут приходить в течение 5 минут
        </p>
      ) : (
        <>
          <p className="flex-1">
            Уведомления выключены. Ответы собеседников не придут.
            {error && <span className="text-destructive"> ({error})</span>}
          </p>
          <Button size="sm" onClick={enable} disabled={status === 'enabling'}>
            Включить
          </Button>
        </>
      )}
    </div>
  )
}
