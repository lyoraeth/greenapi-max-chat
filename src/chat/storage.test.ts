import { beforeEach, describe, expect, it } from 'vitest'
import { initialChatsState, type ChatsState } from '@/chat/state'
import { clearChats, loadChats, saveChats } from '@/chat/storage'

const state: ChatsState = {
  activeChatId: '1',
  chats: [
    {
      chatId: '1',
      title: 'Мурка',
      messages: [{ id: 'm1', text: 'мяу', timestamp: 1763115112, direction: 'incoming' }],
      unread: 2,
    },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

describe('chat storage', () => {
  it('returns empty state when nothing is saved', () => {
    expect(loadChats('3100000001')).toBe(initialChatsState)
  })

  it('restores saved chats', () => {
    saveChats('3100000001', state)

    expect(loadChats('3100000001')).toEqual(state)
  })

  it('keeps chats of different instances apart', () => {
    saveChats('3100000001', state)

    expect(loadChats('3100000002')).toBe(initialChatsState)
  })

  it('fills in the unread counter missing in older records', () => {
    const { unread: _, ...legacyChat } = state.chats[0]
    localStorage.setItem('chats:3100000001', JSON.stringify({ ...state, chats: [legacyChat] }))

    expect(loadChats('3100000001').chats[0].unread).toBe(0)
  })

  it('discards a corrupted record', () => {
    localStorage.setItem('chats:3100000001', '{oops')

    expect(loadChats('3100000001')).toBe(initialChatsState)
  })

  it('clears saved chats', () => {
    saveChats('3100000001', state)
    clearChats('3100000001')

    expect(loadChats('3100000001')).toBe(initialChatsState)
  })
})
