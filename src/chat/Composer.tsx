import { SendHorizontal } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { errorMessage } from '@/api/errorMessage'

// API: предел длины текста у sendMessage, на более длинный отвечает 400
const MAX_MESSAGE_LENGTH = 4000

interface ComposerProps {
  onSend: (text: string) => Promise<void>
}

export function Composer({ onSend }: ComposerProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const canSend = text.trim().length > 0 && !isSending

  async function send() {
    if (!canSend) return
    setError(null)
    setIsSending(true)
    try {
      await onSend(text.trim())
      setText('')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void send()
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Shift+Enter оставлен для переноса строки
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-199.75 px-4 pb-4">
      {error && (
        <p role="alert" className="mb-1 px-1 text-[13px]/4 text-destructive">
          Сообщение не отправлено: {error}
        </p>
      )}
      <div className="flex items-end overflow-hidden rounded-2xl bg-background p-1 shadow-[0_4px_16px_0_#0000004d,0_0_2px_0_#0000004d]">
        <textarea
          aria-label="Сообщение"
          placeholder="Сообщение"
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          // высота ограничена десятью строками, дальше прокрутка
          className="field-sizing-content max-h-55 min-h-10 flex-1 resize-none bg-transparent py-2.5 pl-3 text-base/5 outline-none placeholder:text-tertiary"
        />
        <button
          type="submit"
          aria-label="Отправить"
          disabled={!canSend}
          className="flex h-10 w-12 shrink-0 items-center justify-center text-primary transition-colors hover:text-[#479fff] disabled:text-[#ffffff85]"
        >
          <SendHorizontal className="size-6" />
        </button>
      </div>
    </form>
  )
}
