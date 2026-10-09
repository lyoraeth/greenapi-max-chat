import { describe, expect, it } from 'vitest'
import { filterChats } from '@/chat/search'
import type { Chat } from '@/chat/state'

const chats: Chat[] = [
  {
    chatId: '1',
    title: 'Мурка',
    messages: [{ id: 'm1', text: 'мяу', timestamp: 1, direction: 'incoming' }],
    unread: 0,
  },
  { chatId: '2', title: '+7 999 123-45-67', messages: [], unread: 0 },
]

const ids = (query: string) => filterChats(chats, query).map(({ chatId }) => chatId)

describe('filterChats', () => {
  it('returns all chats for an empty query', () => {
    expect(filterChats(chats, '  ')).toBe(chats)
  })

  it('matches title ignoring case', () => {
    expect(ids('мур')).toEqual(['1'])
  })

  it('matches message text', () => {
    expect(ids('МЯУ')).toEqual(['1'])
  })

  it('matches a phone number typed without formatting', () => {
    expect(ids('9991234')).toEqual(['2'])
  })

  it('returns nothing when there is no match', () => {
    expect(ids('гав')).toEqual([])
  })
})
