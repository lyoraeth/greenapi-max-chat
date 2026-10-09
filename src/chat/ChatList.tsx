import { Plus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Avatar } from '@/chat/Avatar'
import { filterChats } from '@/chat/search'
import type { Chat } from '@/chat/state'
import { StatusMark } from '@/chat/StatusMark'
import { formatTime } from '@/chat/time'
import { cn } from '@/lib/utils'

interface ChatListProps {
  chats: Chat[]
  activeChatId: string | null
  avatars: Record<string, string>
  width: number
  className?: string
  onSelect: (chatId: string) => void
  onNewChat: () => void
}

export function ChatList({
  chats,
  activeChatId,
  avatars,
  width,
  className,
  onSelect,
  onNewChat,
}: ChatListProps) {
  const [query, setQuery] = useState('')
  const visibleChats = filterChats(chats, query)

  return (
    <aside
      // на узком экране панель занимает всю ширину, заданная перетаскиванием не применяется
      className={cn(
        'flex min-h-0 shrink-0 flex-col border-divider max-md:flex-1 md:w-(--sidebar-width) md:border-r',
        className,
      )}
      style={{ '--sidebar-width': `${width}px` } as CSSProperties}
    >
      <header className="flex h-16 shrink-0 items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-2xl/7 font-semibold">Чаты</h1>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Новый чат"
          className="flex size-8 items-center justify-center rounded-full bg-primary transition-colors hover:bg-[#479fff] active:bg-[#006ee5]"
        >
          <Plus className="size-5" />
        </button>
      </header>

      <div className="shrink-0 px-4 pb-2">
        <input
          type="search"
          aria-label="Поиск по чатам"
          placeholder="Найти"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-9 w-full rounded-xl bg-input px-3 py-1.5 text-[15px]/5 outline-none placeholder:text-tertiary max-md:text-base/5 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      {visibleChats.length === 0 ? (
        <p className="px-4 py-6 text-center text-[15px]/5 text-tertiary">
          {chats.length === 0
            ? 'Чатов пока нет. Нажмите «+», чтобы написать по номеру телефона'
            : 'Ничего не найдено'}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visibleChats.map(({ chatId, title, messages, unread }) => {
            const last = messages.at(-1)
            return (
              <li key={chatId}>
                <button
                  type="button"
                  onClick={() => onSelect(chatId)}
                  aria-current={chatId === activeChatId}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-2.25 text-left transition-colors',
                    chatId === activeChatId
                      ? 'bg-cell-selected'
                      : 'hover:bg-cell-hover active:bg-cell-pressed',
                  )}
                >
                  <Avatar chatId={chatId} title={title} src={avatars[chatId]} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="mr-auto truncate pr-2 text-[15px]/5 font-medium">{title}</span>
                      {last?.direction === 'outgoing' && (
                        <StatusMark status={last.status ?? 'sent'} className="text-primary" />
                      )}
                      {last && (
                        <time className="shrink-0 text-[13px]/4 text-tertiary">
                          {formatTime(last.timestamp)}
                        </time>
                      )}
                    </div>
                    <div className="flex items-start gap-3">
                      <p className="line-clamp-2 min-h-10.5 flex-1 pt-0.5 text-[15px]/5 wrap-anywhere text-tertiary">
                        {last ? last.text : 'Нет сообщений'}
                      </p>
                      {unread > 0 && (
                        <span
                          aria-label={`Непрочитанных: ${unread}`}
                          className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs/4 font-medium"
                        >
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
