// API: 'sent' - локальное состояние после ответа sendMessage, от API такой статус не приходит
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  id: string
  text: string
  /** Unix-время в секундах. */
  timestamp: number
  direction: 'incoming' | 'outgoing'
  /** Статус доставки исходящего сообщения; у входящих не задан. */
  status?: MessageStatus
}

export interface Chat {
  chatId: string
  title: string
  messages: Message[]
  /** Число входящих, пришедших, пока чат не был открыт. */
  unread: number
}

export interface ChatsState {
  /** Чаты в порядке убывания последней активности. */
  chats: Chat[]
  activeChatId: string | null
}

type NewMessage = Pick<Message, 'id' | 'text' | 'timestamp'>

export type ChatsAction =
  | { type: 'chatOpened'; chatId: string; title: string }
  | { type: 'chatSelected'; chatId: string }
  | { type: 'chatClosed' }
  | { type: 'messageSent'; chatId: string; message: NewMessage }
  | { type: 'messageReceived'; chatId: string; chatName: string; message: NewMessage }
  | { type: 'statusChanged'; chatId: string; messageId: string; status: MessageStatus }

export const initialChatsState: ChatsState = { chats: [], activeChatId: null }

const STATUS_ORDER: Record<MessageStatus, number> = { sent: 0, failed: 1, delivered: 2, read: 3 }

function markRead(chats: Chat[], target: Chat): Chat[] {
  if (target.unread === 0) return chats
  return chats.map((chat) => (chat === target ? { ...chat, unread: 0 } : chat))
}

/** Добавляет сообщение в чат и поднимает его в начало списка. */
function withMessage(chats: Chat[], chat: Chat, message: Message): Chat[] {
  return [
    { ...chat, messages: [...chat.messages, message] },
    ...chats.filter(({ chatId }) => chatId !== chat.chatId),
  ]
}

export function chatsReducer(state: ChatsState, action: ChatsAction): ChatsState {
  if (action.type === 'chatClosed') return { ...state, activeChatId: null }

  const existing = state.chats.find(({ chatId }) => chatId === action.chatId)

  switch (action.type) {
    case 'chatOpened':
      return {
        chats: existing
          ? markRead(state.chats, existing)
          : [
              { chatId: action.chatId, title: action.title, messages: [], unread: 0 },
              ...state.chats,
            ],
        activeChatId: action.chatId,
      }

    case 'chatSelected':
      return existing
        ? { chats: markRead(state.chats, existing), activeChatId: action.chatId }
        : state

    case 'messageSent':
      if (!existing) return state
      return {
        ...state,
        chats: withMessage(state.chats, existing, {
          ...action.message,
          direction: 'outgoing',
          status: 'sent',
        }),
      }

    case 'messageReceived': {
      // уведомление приходит повторно, если его не удалось удалить из очереди
      if (existing?.messages.some(({ id }) => id === action.message.id)) return state

      const isActive = state.activeChatId === action.chatId
      const chat: Chat = {
        chatId: action.chatId,
        title: action.chatName || existing?.title || action.chatId,
        messages: existing?.messages ?? [],
        unread: isActive ? 0 : (existing?.unread ?? 0) + 1,
      }
      return {
        ...state,
        chats: withMessage(state.chats, chat, { ...action.message, direction: 'incoming' }),
      }
    }

    case 'statusChanged': {
      const message = existing?.messages.find(({ id }) => id === action.messageId)
      // порядок уведомлений не гарантирован: «доставлено» может прийти после «прочитано»
      if (!message || STATUS_ORDER[action.status] <= STATUS_ORDER[message.status ?? 'sent']) {
        return state
      }
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat === existing
            ? {
                ...chat,
                messages: chat.messages.map((m) =>
                  m === message ? { ...m, status: action.status } : m,
                ),
              }
            : chat,
        ),
      }
    }
  }
}
