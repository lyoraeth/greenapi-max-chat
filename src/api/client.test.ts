import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createGreenApiClient,
  GreenApiError,
  isIncomingTextMessage,
  isOutgoingMessageStatus,
  messageText,
} from '@/api/client'

const credentials = {
  apiUrl: 'https://3100.api.green-api.com',
  idInstance: '3100000001',
  apiTokenInstance: 'token',
}
const base = 'https://3100.api.green-api.com/waInstance3100000001'

const fetchMock = vi.fn<typeof fetch>()

function respond(body: unknown, status = 200) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  fetchMock.mockResolvedValueOnce(new Response(text, { status }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('createGreenApiClient', () => {
  const client = createGreenApiClient(credentials)

  it('reads instance state', async () => {
    respond({ stateInstance: 'authorized' })

    await expect(client.getStateInstance()).resolves.toBe('authorized')
    expect(fetchMock).toHaveBeenCalledWith(`${base}/getStateInstance/token`, undefined)
  })

  it('throws with status on invalid credentials', async () => {
    respond('', 401)

    await expect(client.getStateInstance()).rejects.toMatchObject({
      name: 'GreenApiError',
      status: 401,
    })
  })

  it.each([
    [{ incomingWebhook: 'yes', outgoingWebhook: 'yes', outgoingAPIMessageWebhook: 'yes' }, true],
    [{ incomingWebhook: 'yes', outgoingWebhook: 'no', outgoingAPIMessageWebhook: 'yes' }, false],
    [{ incomingWebhook: 'no', outgoingWebhook: 'yes', outgoingAPIMessageWebhook: 'yes' }, false],
  ])('checks required notification settings (%j)', async (settings, expected) => {
    respond({ ...settings, webhookUrl: '' })

    await expect(client.areNotificationsEnabled()).resolves.toBe(expected)
    expect(fetchMock.mock.calls[0][0]).toBe(`${base}/getSettings/token`)
  })

  it('throws when settings are not saved', async () => {
    respond({ saveSettings: false })

    await expect(client.enableNotifications()).rejects.toBeInstanceOf(GreenApiError)
  })

  it('enables required notifications', async () => {
    respond({ saveSettings: true })

    await client.enableNotifications()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${base}/setSettings/token`)
    expect(init?.body).toBe(
      '{"incomingWebhook":"yes","outgoingWebhook":"yes","outgoingAPIMessageWebhook":"yes"}',
    )
  })

  it('sends phone number as integer to checkAccount', async () => {
    respond({ exist: true, chatId: '10000000', fromCache: true })

    await expect(client.checkAccount('79991234567')).resolves.toEqual({
      exist: true,
      chatId: '10000000',
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${base}/checkAccount/token`)
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"phoneNumber":79991234567}')
  })

  it('throws when checkAccount is refused with 200', async () => {
    respond({ status: false, reason: 'instance is starting or not authorized' })

    await expect(client.checkAccount('79991234567')).rejects.toThrow(
      'instance is starting or not authorized',
    )
  })

  it.each([
    ['https://i.oneme.ru/i?r=abc', 'https://i.oneme.ru/i?r=abc'],
    ['', null],
  ])('reads avatar url (%j)', async (urlAvatar, expected) => {
    respond({ urlAvatar })

    await expect(client.getAvatar('10000000')).resolves.toBe(expected)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${base}/getAvatar/token`)
    expect(init?.body).toBe('{"chatId":"10000000"}')
  })

  it('sends a text message', async () => {
    respond({ idMessage: '1763115112345' })

    await expect(client.sendMessage('10000000', 'мяу')).resolves.toEqual({
      idMessage: '1763115112345',
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${base}/sendMessage/token`)
    expect(init?.body).toBe('{"chatId":"10000000","message":"мяу"}')
  })

  it('takes error message from response body', async () => {
    respond({ message: 'Validation failed' }, 400)

    const error = await client.sendMessage('10000000', '').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GreenApiError)
    expect(error).toMatchObject({ status: 400, message: 'Validation failed' })
  })

  it('receives a notification', async () => {
    const notification = { receiptId: 1, body: { typeWebhook: 'stateInstanceChanged' } }
    respond(notification)

    await expect(client.receiveNotification(5)).resolves.toEqual(notification)
    expect(fetchMock.mock.calls[0][0]).toBe(`${base}/receiveNotification/token?receiveTimeout=5`)
  })

  it.each(['', 'null'])('returns null when the queue is empty (%j)', async (body) => {
    respond(body)

    await expect(client.receiveNotification(5)).resolves.toBeNull()
  })

  it('passes abort signal to receiveNotification', async () => {
    respond('')
    const { signal } = new AbortController()

    await client.receiveNotification(5, signal)
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(signal)
  })

  it('deletes a notification by receipt id', async () => {
    respond({ result: true, reason: '' })

    await client.deleteNotification(42)
    expect(fetchMock).toHaveBeenCalledWith(`${base}/deleteNotification/token/42`, {
      method: 'DELETE',
    })
  })
})

describe('isOutgoingMessageStatus', () => {
  it('recognizes a status notification', () => {
    const status = {
      typeWebhook: 'outgoingMessageStatus',
      chatId: '10000000',
      idMessage: '115054445839974415',
      status: 'delivered',
    } as const

    expect(isOutgoingMessageStatus(status)).toBe(true)
    expect(isOutgoingMessageStatus({ typeWebhook: 'stateInstanceChanged' })).toBe(false)
  })
})

describe('isIncomingTextMessage', () => {
  const textMessage = {
    typeWebhook: 'incomingMessageReceived',
    timestamp: 1763115112,
    idMessage: '1763115112345',
    senderData: { chatId: '10000000', chatName: 'Мурка', sender: '10000000', senderName: 'Мурка' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'мяу' } },
  }

  it('accepts incoming text message', () => {
    expect(isIncomingTextMessage(textMessage)).toBe(true)
  })

  it('accepts extended text message', () => {
    const extended = {
      ...textMessage,
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'мяу' },
      },
    } as const

    expect(isIncomingTextMessage(extended)).toBe(true)
    expect(isIncomingTextMessage(extended) && messageText(extended)).toBe('мяу')
  })

  it('rejects other notification types', () => {
    expect(isIncomingTextMessage({ typeWebhook: 'outgoingMessageStatus' })).toBe(false)
    expect(
      isIncomingTextMessage({
        ...textMessage,
        messageData: { typeMessage: 'imageMessage' },
      } as never),
    ).toBe(false)
  })
})
