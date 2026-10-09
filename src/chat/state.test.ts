import { describe, expect, it } from 'vitest'
import { chatsReducer, initialChatsState, type ChatsAction, type ChatsState } from '@/chat/state'

function reduce(actions: ChatsAction[], state: ChatsState = initialChatsState): ChatsState {
  return actions.reduce(chatsReducer, state)
}

const message = (id: string, text = 'мяу') => ({ id, text, timestamp: 1763115112 })

describe('chatsReducer', () => {
  it('opens a new chat and makes it active', () => {
    const state = reduce([{ type: 'chatOpened', chatId: '1', title: '+7 999 123-45-67' }])

    expect(state.activeChatId).toBe('1')
    expect(state.chats).toEqual([
      { chatId: '1', title: '+7 999 123-45-67', messages: [], unread: 0 },
    ])
  })

  it('does not duplicate a chat opened twice', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: 'a' },
      { type: 'chatOpened', chatId: '2', title: 'b' },
      { type: 'chatOpened', chatId: '1', title: 'a' },
    ])

    expect(state.chats.map((c) => c.chatId)).toEqual(['2', '1'])
    expect(state.activeChatId).toBe('1')
  })

  it('ignores selection of an unknown chat', () => {
    const state = reduce([{ type: 'chatSelected', chatId: '1' }])

    expect(state).toBe(initialChatsState)
  })

  it('appends a sent message as outgoing', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: 'a' },
      { type: 'messageSent', chatId: '1', message: message('m1') },
    ])

    expect(state.chats[0].messages).toEqual([
      { ...message('m1'), direction: 'outgoing', status: 'sent' },
    ])
  })

  it('moves the chat with the latest message to the top', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: 'a' },
      { type: 'chatOpened', chatId: '2', title: 'b' },
      { type: 'messageReceived', chatId: '1', chatName: 'a', message: message('m1') },
    ])

    expect(state.chats.map((c) => c.chatId)).toEqual(['1', '2'])
    expect(state.activeChatId).toBe('2')
  })

  it('creates a chat for a message from an unknown sender', () => {
    const state = reduce([
      { type: 'messageReceived', chatId: '5', chatName: 'Мурка', message: message('m1') },
    ])

    expect(state.chats).toEqual([
      {
        chatId: '5',
        title: 'Мурка',
        messages: [{ ...message('m1'), direction: 'incoming' }],
        unread: 1,
      },
    ])
    expect(state.activeChatId).toBeNull()
  })

  it('replaces the phone number title with the sender name', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: '+7 999 123-45-67' },
      { type: 'messageReceived', chatId: '1', chatName: 'Мурка', message: message('m1') },
    ])

    expect(state.chats[0].title).toBe('Мурка')
  })

  it('keeps the title when the sender name is empty', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: '+7 999 123-45-67' },
      { type: 'messageReceived', chatId: '1', chatName: '', message: message('m1') },
    ])

    expect(state.chats[0].title).toBe('+7 999 123-45-67')
  })

  it('drops a redelivered message', () => {
    const state = reduce([
      { type: 'messageReceived', chatId: '1', chatName: 'a', message: message('m1') },
      { type: 'messageReceived', chatId: '1', chatName: 'a', message: message('m1') },
    ])

    expect(state.chats[0].messages).toHaveLength(1)
  })

  it('counts messages received while the chat is not open', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: 'a' },
      { type: 'chatOpened', chatId: '2', title: 'b' },
      { type: 'messageReceived', chatId: '1', chatName: 'a', message: message('m1') },
      { type: 'messageReceived', chatId: '1', chatName: 'a', message: message('m2') },
      { type: 'messageReceived', chatId: '2', chatName: 'b', message: message('m3') },
    ])

    const unread = Object.fromEntries(state.chats.map((c) => [c.chatId, c.unread]))
    expect(unread).toEqual({ 1: 2, 2: 0 })
  })

  it('does not count a redelivered message twice', () => {
    const state = reduce([
      { type: 'messageReceived', chatId: '1', chatName: 'a', message: message('m1') },
      { type: 'messageReceived', chatId: '1', chatName: 'a', message: message('m1') },
    ])

    expect(state.chats[0].unread).toBe(1)
  })

  it('resets the counter when the chat is selected', () => {
    const state = reduce([
      { type: 'messageReceived', chatId: '1', chatName: 'a', message: message('m1') },
      { type: 'chatSelected', chatId: '1' },
    ])

    expect(state.chats[0].unread).toBe(0)
  })

  it('marks a sent message with the initial status', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: 'a' },
      { type: 'messageSent', chatId: '1', message: message('m1') },
    ])

    expect(state.chats[0].messages[0].status).toBe('sent')
  })

  it('updates message status', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: 'a' },
      { type: 'messageSent', chatId: '1', message: message('m1') },
      { type: 'statusChanged', chatId: '1', messageId: 'm1', status: 'read' },
    ])

    expect(state.chats[0].messages[0].status).toBe('read')
  })

  it('does not downgrade status when notifications arrive out of order', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: 'a' },
      { type: 'messageSent', chatId: '1', message: message('m1') },
      { type: 'statusChanged', chatId: '1', messageId: 'm1', status: 'read' },
      { type: 'statusChanged', chatId: '1', messageId: 'm1', status: 'delivered' },
    ])

    expect(state.chats[0].messages[0].status).toBe('read')
  })

  it('ignores status of an unknown message', () => {
    const before = reduce([{ type: 'chatOpened', chatId: '1', title: 'a' }])
    const after = reduce(
      [{ type: 'statusChanged', chatId: '1', messageId: 'nope', status: 'read' }],
      before,
    )

    expect(after).toBe(before)
  })

  it('closes the active chat keeping the list', () => {
    const state = reduce([
      { type: 'chatOpened', chatId: '1', title: 'a' },
      { type: 'chatClosed' },
    ])

    expect(state.activeChatId).toBeNull()
    expect(state.chats).toHaveLength(1)
  })
})
