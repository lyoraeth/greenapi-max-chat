import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/api/errorMessage'
import { maskPhone, normalizePhone } from '@/chat/phone'
import { AccountNotFoundError } from '@/chat/useChat'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface NewChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Открывает чат по нормализованному номеру, откл, если чат открыть не удалось. */
  onSubmit: (phone: string) => Promise<void>
}

export function NewChatDialog({ open, onOpenChange, onSubmit }: NewChatDialogProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setValue('')
      setError(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const phone = normalizePhone(value)
    if (!phone) {
      setError('Введите номер России (+7) или Беларуси (+375) целиком')
      return
    }

    setError(null)
    setIsPending(true)
    try {
      await onSubmit(phone)
      handleOpenChange(false)
    } catch (cause) {
      setError(
        cause instanceof AccountNotFoundError
          ? 'Этот номер не зарегистрирован'
          : errorMessage(cause),
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[17px]/6 font-semibold">Новый чат</DialogTitle>
          <DialogDescription>Номер телефона получателя</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            aria-label="Номер телефона"
            placeholder="+7 999 123-45-67"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(event) => setValue(maskPhone(event.target.value))}
          />
          {error && (
            <p role="alert" className="text-[13px]/4 text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="xl" disabled={!value.trim() || isPending}>
            {isPending ? 'Ищем…' : 'Начать чат'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
