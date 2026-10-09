import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const GRADIENTS = [
  ['#ff48b6', '#ff8a35'],
  ['#14e1d5', '#03c722'],
  ['#ffc93d', '#ff832a'],
  ['#08d7f3', '#5398ff'],
  ['#bf97ff', '#526eff'],
]

function pickGradient(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % GRADIENTS.length
  const [from, to] = GRADIENTS[hash]
  return `linear-gradient(135deg, ${from}, ${to})`
}

function initials(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

interface AvatarProps {
  chatId: string
  title: string
  src?: string
  className?: string
}

export function Avatar({ chatId, title, src, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const hasName = /\p{L}/u.test(title)

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailedSrc(src)}
        className={cn('size-16 shrink-0 rounded-full object-cover', className)}
      />
    )
  }

  return (
    <div
      aria-hidden
      className={cn(
        'flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-medium text-white',
        className,
      )}
      style={{ background: pickGradient(chatId) }}
    >
      {hasName ? initials(title) : <UserRound className="size-1/2" />}
    </div>
  )
}
