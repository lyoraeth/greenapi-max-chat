import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginScreen } from '@/session/LoginScreen'

const TOKEN = 'a1b2c3d4e5'.repeat(5)
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

async function submit(fields: { idInstance?: string; token?: string; apiUrl?: string }) {
  const user = userEvent.setup()
  if (fields.idInstance) await user.type(screen.getByLabelText('idInstance'), fields.idInstance)
  if (fields.token) await user.type(screen.getByLabelText('apiTokenInstance'), fields.token)
  if (fields.apiUrl) await user.type(screen.getByLabelText(/^apiUrl/), fields.apiUrl)
  await user.click(screen.getByRole('button', { name: 'Войти' }))
}

describe('LoginScreen', () => {
  it('logs in with api url derived from idInstance', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"stateInstance":"authorized"}'))
    const onLogin = vi.fn()
    render(<LoginScreen onLogin={onLogin} />)

    await submit({ idInstance: '3100000001', token: TOKEN })

    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://3100.api.green-api.com/waInstance3100000001/getStateInstance/${TOKEN}`,
    )
    expect(onLogin).toHaveBeenCalledWith({
      idInstance: '3100000001',
      apiTokenInstance: TOKEN,
      apiUrl: 'https://3100.api.green-api.com',
    })
  })

  it('prefers explicitly entered api url', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"stateInstance":"authorized"}'))
    const onLogin = vi.fn()
    render(<LoginScreen onLogin={onLogin} />)

    await submit({ idInstance: '3100000001', token: TOKEN, apiUrl: 'https://api.example.com/' })

    expect(onLogin).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: 'https://api.example.com' }),
    )
  })

  it('masks pasted values', async () => {
    render(<LoginScreen onLogin={vi.fn()} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('idInstance'), '3100 000-001')
    await user.type(screen.getByLabelText('apiTokenInstance'), ' ab cd-12 ')

    expect(screen.getByLabelText('idInstance')).toHaveValue('3100000001')
    expect(screen.getByLabelText('apiTokenInstance')).toHaveValue('abcd12')
  })

  it('does not send a request while fields are invalid', async () => {
    const onLogin = vi.fn()
    render(<LoginScreen onLogin={onLogin} />)

    await submit({ idInstance: '3100', token: 'short' })

    expect(screen.getByLabelText('idInstance')).toBeInvalid()
    expect(screen.getByLabelText('apiTokenInstance')).toBeInvalid()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('shows an error on invalid credentials', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    const onLogin = vi.fn()
    render(<LoginScreen onLogin={onLogin} />)

    await submit({ idInstance: '3100000001', token: TOKEN })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Неверные idInstance или apiTokenInstance',
    )
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('rejects an instance that is not authorized', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{"stateInstance":"notAuthorized"}'))
    const onLogin = vi.fn()
    render(<LoginScreen onLogin={onLogin} />)

    await submit({ idInstance: '3100000001', token: TOKEN })

    expect(await screen.findByRole('alert')).toHaveTextContent('notAuthorized')
    expect(onLogin).not.toHaveBeenCalled()
  })
})
