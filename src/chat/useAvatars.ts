import { useEffect, useRef, useState } from 'react'
import type { GreenApiClient } from '@/api/client'

/**
 * Загружает ссылки на аватары чатов, по одному запросу на чат за время жизни хука.
 *
 * @returns ссылки по `chatId`; чаты без аватара в результат не попадают
 *
 * API: срок жизни ссылки не документирован, поэтому она не сохраняется между
 * сессиями и запрашивается заново.
 */
export function useAvatars(client: GreenApiClient, chatIds: string[]): Record<string, string> {
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const requested = useRef(new Set<string>())

  useEffect(() => {
    for (const chatId of chatIds) {
      if (requested.current.has(chatId)) continue
      requested.current.add(chatId)
      client
        .getAvatar(chatId)
        .then((url) => {
          if (url) setAvatars((prev) => ({ ...prev, [chatId]: url }))
        })
        // без аватара остается заглушка с инициалами
        .catch(() => {})
    }
  }, [client, chatIds])

  return avatars
}
