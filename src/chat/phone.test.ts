import { describe, expect, it } from 'vitest'
import { maskPhone, normalizePhone } from '@/chat/phone'

describe('normalizePhone', () => {
  it.each([
    ['79991234567', '79991234567'],
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['999 123 45 67', '79991234567'],
    ['+375 29 123-45-67', '375291234567'],
  ])('accepts %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each(['', '+7 999 123', '799912345678', '+1 202 555 0100', 'мяу'])('rejects %j', (input) => {
    expect(normalizePhone(input)).toBeNull()
  })
})

describe('maskPhone', () => {
  it.each([
    ['', ''],
    ['+', '+'],
    ['7', '+7'],
    ['7999', '+7 999'],
    ['79991', '+7 999 1'],
    ['7999123', '+7 999 123'],
    ['799912345', '+7 999 123-45'],
    ['79991234567', '+7 999 123-45-67'],
    ['89991234567', '+7 999 123-45-67'],
    ['9991234567', '+7 999 123-45-67'],
    ['375291234567', '+375 29 123-45-67'],
    ['+7 (999) 123-45-67', '+7 999 123-45-67'],
  ])('formats %j as %j', (input, expected) => {
    expect(maskPhone(input)).toBe(expected)
  })

  it('drops digits beyond the number length', () => {
    expect(maskPhone('799912345678')).toBe('+7 999 123-45-67')
  })

  it('does not keep a trailing separator, so backspace works', () => {
    expect(maskPhone('+7 999 ')).toBe('+7 999')
  })
})
