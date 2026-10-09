import { useCallback, useEffect, useReducer, useState } from 'react'
import {
  isIncomingTextMessage,
  isOutgoingMessageStatus,
  messageText,
  type GreenApiClient,
} from '@/api/client'
import { errorMessage } from '@/api/errorMessage'
import { maskPhone } from '@/chat/phone'
import { pollNotifications } from '@/chat/polling'
import { chatsReducer } from '@/chat/state'
import { loadChats, saveChats } from '@/chat/storage'

export class AccountNotFoundError extends Error {
  constructor() {
    super('Account not found')
    this.name = 'AccountNotFoundError'
  }
}

/** Состояние чатов инстанса и действия над ними; пока хук смонтирован, опрашивает очередь уведомлений. */
export function useChat(client: GreenApiClient, idInstance: string) {
  const [state, dispatch] = useReducer(chatsReducer, idInstance, loadChats)
  const [pollError, setPollError] = useState<string | null>(null)
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false)

  useEffect(() => {
    saveChats(idInstance, state)
  }, [idInstance, state])

  useEffect(() => {
    const controller = new AbortController()
    void pollNotifications(client, {
      signal: controller.signal,
      onNotification(body) {
        // API: приходит при превышении лимитов тарифа; на Developer это три чата
        if (body.typeWebhook === 'quotaExceeded') setIsQuotaExceeded(true)
        // API: статус может прийти раньше, чем вернется ответ sendMessage; сообщения
        // в состоянии еще нет, и такой статус отбрасывается
        if (isOutgoingMessageStatus(body)) {
          dispatch({
            type: 'statusChanged',
            chatId: body.chatId,
            messageId: body.idMessage,
            // прочие значения (noAccount, notInGroup) - тоже отказ в доставке
            status: body.status === 'delivered' || body.status === 'read' ? body.status : 'failed',
          })
          return
        }
        if (!isIncomingTextMessage(body)) return
        dispatch({
          type: 'messageReceived',
          chatId: body.senderData.chatId,
          chatName: body.senderData.chatName,
          message: {
            id: body.idMessage,
            text: messageText(body),
            timestamp: body.timestamp,
          },
        })
      },
      onSuccess: () => setPollError(null),
      onError: (error) => setPollError(errorMessage(error)),
    })
    return () => controller.abort()
  }, [client])

  /**
   * Открывает чат с получателем по нормализованному номеру телефона.
   *
   * @throws {@link AccountNotFoundError} если номер не зарегистрирован в мессенджере
   */
  const openChat = useCallback(
    async (phone: string) => {
      const { exist, chatId } = await client.checkAccount(phone)
      if (!exist) throw new AccountNotFoundError()
      // API: имя собеседника по номеру не возвращается, до первого входящего
      // сообщения заголовком чата служит номер
      dispatch({ type: 'chatOpened', chatId, title: maskPhone(phone) })
    },
    [client],
  )

  const selectChat = useCallback((chatId: string) => {
    dispatch({ type: 'chatSelected', chatId })
  }, [])

  const closeChat = useCallback(() => {
    dispatch({ type: 'chatClosed' })
  }, [])

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const { idMessage } = await client.sendMessage(chatId, text)
      dispatch({
        type: 'messageSent',
        chatId,
        // API: время отправки в ответе не приходит, берется по часам клиента
        message: { id: idMessage, text, timestamp: Math.floor(Date.now() / 1000) },
      })
    },
    [client],
  )

  return { ...state, pollError, isQuotaExceeded, openChat, selectChat, closeChat, sendMessage }
}
