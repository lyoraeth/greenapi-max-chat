import type { Chat } from '@/chat/state'

/**
 * Отбирает чаты, у которых запрос встречается в названии или в тексте сообщений.
 *
 * @returns исходный список, если запрос пуст
 */
export function filterChats(chats: Chat[], query: string): Chat[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return chats

  // номер в заголовке отформатирован, поэтому цифры сравниваются отдельно
  const digits = needle.replace(/\D/g, '')
  return chats.filter(
    ({ title, messages }) =>
      title.toLocaleLowerCase().includes(needle) ||
      (digits.length > 0 && title.replace(/\D/g, '').includes(digits)) ||
      messages.some(({ text }) => text.toLocaleLowerCase().includes(needle)),
  )
}
