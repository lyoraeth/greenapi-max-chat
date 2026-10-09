import { initialChatsState, type ChatsState } from '@/chat/state'

const storageKey = (idInstance: string) => `chats:${idInstance}`

// API: история хранится на стороне клиента - журналы сообщений API приложение не
// запрашивает, поэтому отправленное с другого устройства сюда не попадает
/** Читает сохраненные чаты инстанса; при отсутствии или повреждении записи возвращает пустое состояние. */
export function loadChats(idInstance: string): ChatsState {
  const raw = localStorage.getItem(storageKey(idInstance))
  if (!raw) return initialChatsState
  try {
    const state = JSON.parse(raw) as ChatsState
    if (!Array.isArray(state.chats)) return initialChatsState
    // счетчик появился позже остальных полей, в ранее сохраненных чатах его нет
    return { ...state, chats: state.chats.map((chat) => ({ ...chat, unread: chat.unread ?? 0 })) }
  } catch {
    // кэш не должен мешать входу, поврежденную запись отбрасываем
    return initialChatsState
  }
}

export function saveChats(idInstance: string, state: ChatsState): void {
  localStorage.setItem(storageKey(idInstance), JSON.stringify(state))
}

export function clearChats(idInstance: string): void {
  localStorage.removeItem(storageKey(idInstance))
}
