import { CircleAlert } from 'lucide-react'
import type { MessageStatus } from '@/chat/state'
import { cn } from '@/lib/utils'

const LABELS: Record<MessageStatus, string> = {
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не доставлено',
}

interface StatusMarkProps {
  status: MessageStatus
  className?: string
}

/** Отметка статуса исходящего сообщения: одна галочка до прочтения, две после. */
export function StatusMark({ status, className }: StatusMarkProps) {
  if (status === 'failed') {
    return (
      // цвет ошибки не зависит от места, где стоит отметка
      <CircleAlert role="img" aria-label={LABELS.failed} className="size-4 shrink-0 text-[#e64646]" />
    )
  }

  return (
    <svg
      role="img"
      aria-label={LABELS[status]}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
    >
      {status === 'read' ? (
        <>
          <path d="m1 8.5 3 3 6-7" />
          <path d="m5.5 8.5 3 3 6-7" />
        </>
      ) : (
        <path d="m3.5 8.5 3 3 6-7" />
      )}
    </svg>
  )
}
