import { useId, useState, type ComponentProps, type FormEvent } from 'react'
import { createGreenApiClient } from '@/api/client'
import { errorMessage } from '@/api/errorMessage'
import type { Credentials } from '@/api/types'
import { DISCLAIMER_COPYRIGHT } from '@/components/Disclaimer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolveApiUrl } from '@/session/credentials'
import {
  maskIdInstance,
  maskToken,
  validateApiUrl,
  validateIdInstance,
  validateToken,
} from '@/session/validation'

interface FieldProps extends Omit<ComponentProps<typeof Input>, 'onChange'> {
  label: string
  error: string | null
  onChange: (value: string) => void
}

function Field({ label, error, onChange, ...props }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="px-1 text-[13px]/4 text-tertiary">
        {label}
      </label>
      <Input
        id={id}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
      {error && (
        <p id={errorId} className="px-1 text-[13px]/4 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type FieldName = 'idInstance' | 'apiTokenInstance' | 'apiUrl'

interface LoginScreenProps {
  onLogin: (credentials: Credentials) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    idInstance: false,
    apiTokenInstance: false,
    apiUrl: false,
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const errors: Record<FieldName, string | null> = {
    idInstance: validateIdInstance(idInstance),
    apiTokenInstance: validateToken(apiTokenInstance),
    apiUrl: validateApiUrl(apiUrl.trim()),
  }
  const isValid = Object.values(errors).every((error) => error === null)

  const shown = (name: FieldName) => (touched[name] ? errors[name] : null)
  const touch = (name: FieldName) => () => setTouched((prev) => ({ ...prev, [name]: true }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched({ idInstance: true, apiTokenInstance: true, apiUrl: true })
    if (!isValid) return

    const credentials: Credentials = {
      idInstance,
      apiTokenInstance,
      apiUrl: apiUrl.trim().replace(/\/+$/, '') || resolveApiUrl(idInstance),
    }

    setSubmitError(null)
    setIsPending(true)
    try {
      const state = await createGreenApiClient(credentials).getStateInstance()
      if (state !== 'authorized') {
        setSubmitError(`Инстанс не авторизован в мессенджере (состояние: ${state})`)
        return
      }
      onLogin(credentials)
    } catch (cause) {
      setSubmitError(errorMessage(cause))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-surface p-4">
      <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-100 flex-col gap-4 relative">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-5xl/12 font-semibold">NotMAX</h1>
          <p className="text-center text-[9px]/3 font-bold text-tertiary">
            *{DISCLAIMER_COPYRIGHT}
          </p>
          <p className="text-[16px]/5 text-muted-foreground mt-6">
            Введите параметры инстанса из личного кабинета GREEN-API
          </p>
        </div>

        <Field
          label="idInstance"
          placeholder="3100000001"
          inputMode="numeric"
          value={idInstance}
          onChange={(value) => setIdInstance(maskIdInstance(value))}
          onBlur={touch('idInstance')}
          error={shown('idInstance')}
        />
        <Field
          label="apiTokenInstance"
          type="password"
          value={apiTokenInstance}
          onChange={(value) => setApiTokenInstance(maskToken(value))}
          onBlur={touch('apiTokenInstance')}
          error={shown('apiTokenInstance')}
        />
        <Field
          label="apiUrl (необязательно)"
          type="url"
          placeholder={
            errors.idInstance ? 'Определится по idInstance' : resolveApiUrl(idInstance)
          }
          value={apiUrl}
          onChange={setApiUrl}
          onBlur={touch('apiUrl')}
          error={shown('apiUrl')}
        />

        {submitError && (
          <p role="alert" className="text-center text-[13px]/4 text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" size="xl" disabled={isPending}>
          {isPending ? 'Проверяем…' : 'Войти'}
        </Button>
      </form>
    </div>
  )
}
