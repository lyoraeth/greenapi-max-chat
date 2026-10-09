import { ArrowLeft } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'
import { Avatar } from '@/chat/Avatar'
import { Composer } from '@/chat/Composer'
import type { Chat, Message } from '@/chat/state'
import { StatusMark } from '@/chat/StatusMark'
import { formatDay, formatTime, isSameDay } from '@/chat/time'
import { cn } from '@/lib/utils'

const META_CLASS = 'h-4 items-center gap-0.5 text-[11px]/3.5 tracking-[0.3px]'

interface BubbleProps {
  message: Message
  /** Первое в серии подряд идущих сообщений одного отправителя. */
  isFirst: boolean
  /** Последнее в такой серии. */
  isLast: boolean
}

function Bubble({ message, isFirst, isLast }: BubbleProps) {
  const isOutgoing = message.direction === 'outgoing'
  const meta = (
    <>
      <time>{formatTime(message.timestamp)}</time>
      {isOutgoing && <StatusMark status={message.status ?? 'sent'} className="text-[#ffffffe0]" />}
    </>
  )

  return (
    <li
      className={cn(
        'relative my-px max-w-[85%] rounded-2xl md:max-w-[70%]',
        isFirst && 'mt-1',
        isLast && 'mb-1',
        isOutgoing
          ? 'self-end bg-(image:--bubble-outgoing)'
          : 'self-start bg-(image:--bubble-incoming)',
        // внутри серии месседжей углы со стороны отправителя скруглены меньше
        !isFirst && (isOutgoing ? 'rounded-tr-md' : 'rounded-tl-md'),
        !isLast && (isOutgoing ? 'rounded-br-md' : 'rounded-bl-md'),
      )}
    >
      <p className="px-2.5 pt-2 pb-2.5 text-base/5 tracking-normal wrap-anywhere whitespace-pre-wrap">
        {message.text}
        {/* резервирует место в последней строке под время и отметку, которые стоят на абсолюте */}
        <span aria-hidden className={cn(META_CLASS, 'invisible ml-1 inline-flex')}>
          {meta}
        </span>
      </p>
      <div className={cn(META_CLASS, 'absolute right-2.5 bottom-1 flex text-tertiary')}>{meta}</div>
    </li>
  )
}

function DaySeparator({ timestamp }: { timestamp: number }) {
  return (
    <li className="my-1 flex justify-center">
      <span className="rounded-md bg-capsule px-1.5 py-px text-sm/4.5 backdrop-blur-[25px]">
        {formatDay(timestamp)}
      </span>
    </li>
  )
}

interface ChatViewProps {
  chat: Chat
  avatar?: string
  onClose: () => void
  onSend: (text: string) => Promise<void>
}

export function ChatView({ chat, avatar, onClose, onSend }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { messages } = chat

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [chat.chatId, messages.length])

  return (
    <>
      <header className="flex shrink-0 items-center border-b border-divider bg-background px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть чат"
          className="mr-2 flex size-10 shrink-0 items-center justify-center rounded-[18px] transition-colors hover:bg-[#e7e7e70a] active:bg-[#e7e7e714]"
        >
          <ArrowLeft className="size-6" />
        </button>
        <Avatar chatId={chat.chatId} title={chat.title} src={avatar} className="mr-3 size-10 text-sm" />
        <h2 className="truncate text-base/5 font-semibold">{chat.title}</h2>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <ul className="mx-auto flex min-h-full w-full max-w-197.75 flex-col justify-end px-4 py-2">
          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const next = messages[index + 1]
            const startsDay = !previous || !isSameDay(previous.timestamp, message.timestamp)
            const endsDay = !next || !isSameDay(message.timestamp, next.timestamp)

            return (
              <Fragment key={message.id}>
                {startsDay && <DaySeparator timestamp={message.timestamp} />}
                <Bubble
                  message={message}
                  isFirst={startsDay || previous.direction !== message.direction}
                  isLast={endsDay || next.direction !== message.direction}
                />
              </Fragment>
            )
          })}
        </ul>
      </div>

      <Composer key={chat.chatId} onSend={onSend} />
    </>
  )
}
