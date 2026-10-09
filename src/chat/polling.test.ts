import { describe, expect, it, vi } from 'vitest'
import type { Notification } from '@/api/types'
import { pollNotifications } from '@/chat/polling'

const notification: Notification = { receiptId: 7, body: { typeWebhook: 'stateInstanceChanged' } }

/** Собирает клиент, который отдает заданные ответы и останавливает опрос после последнего. */
function setup(responses: Array<Notification | null | Error>) {
  const controller = new AbortController()
  const queue = [...responses]
  const calls: string[] = []

  const client = {
    receiveNotification: vi.fn(async () => {
      calls.push('receive')
      const next = queue.shift()
      if (queue.length === 0) controller.abort()
      if (next instanceof Error) throw next
      return next ?? null
    }),
    deleteNotification: vi.fn(async () => {
      calls.push('delete')
    }),
  }
  const onNotification = vi.fn(() => {
    calls.push('handle')
  })
  const onError = vi.fn()
  const onSuccess = vi.fn()

  const run = () =>
    pollNotifications(client, {
      signal: controller.signal,
      onNotification,
      onSuccess,
      onError,
      retryDelayMs: 0,
    })

  return { client, onNotification, onSuccess, onError, calls, run, controller }
}

describe('pollNotifications', () => {
  it('handles a notification before deleting it', async () => {
    const { run, calls, client, onNotification } = setup([notification])

    await run()

    expect(calls).toEqual(['receive', 'handle', 'delete'])
    expect(onNotification).toHaveBeenCalledWith(notification.body)
    expect(client.deleteNotification).toHaveBeenCalledWith(7)
  })

  it('keeps polling while the queue is empty', async () => {
    const { run, client, onNotification } = setup([null, null, notification])

    await run()

    expect(client.receiveNotification).toHaveBeenCalledTimes(3)
    expect(onNotification).toHaveBeenCalledTimes(1)
  })

  it('reports an error and retries', async () => {
    const error = new Error('network')
    const { run, client, onError, onSuccess, onNotification } = setup([error, null, notification])

    await run()

    expect(onError).toHaveBeenCalledWith(error)
    expect(onSuccess).toHaveBeenCalledTimes(2)
    expect(client.receiveNotification).toHaveBeenCalledTimes(3)
    expect(onNotification).toHaveBeenCalledTimes(1)
  })

  it('stays silent when the request is aborted', async () => {
    const { run, onError } = setup([new DOMException('aborted', 'AbortError')])

    await run()

    expect(onError).not.toHaveBeenCalled()
  })

  it('does not start when already aborted', async () => {
    const { run, client, controller } = setup([notification])
    controller.abort()

    await run()

    expect(client.receiveNotification).not.toHaveBeenCalled()
  })
})
