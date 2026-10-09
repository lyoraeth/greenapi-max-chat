import { describe, expect, it } from 'vitest'
import {
  maskIdInstance,
  maskToken,
  validateApiUrl,
  validateIdInstance,
  validateToken,
} from '@/session/validation'

describe('masks', () => {
  it('keeps only digits in idInstance', () => {
    expect(maskIdInstance(' 3100 000-001a')).toBe('3100000001')
  })

  it('strips whitespace and punctuation from token', () => {
    expect(maskToken(' abc123\nDEF-456 ')).toBe('abc123DEF456')
  })
})

describe('validateIdInstance', () => {
  it('accepts a full instance number', () => {
    expect(validateIdInstance('3100000001')).toBeNull()
  })

  it.each(['', '310000'])('rejects %j', (value) => {
    expect(validateIdInstance(value)).not.toBeNull()
  })
})

describe('validateToken', () => {
  it('accepts a token of sufficient length', () => {
    expect(validateToken('a'.repeat(50))).toBeNull()
  })

  it.each(['', 'short'])('rejects %j', (value) => {
    expect(validateToken(value)).not.toBeNull()
  })
})

describe('validateApiUrl', () => {
  it.each(['', 'https://3100.api.green-api.com'])('accepts %j', (value) => {
    expect(validateApiUrl(value)).toBeNull()
  })

  it.each(['3100.api.green-api.com', 'http://3100.api.green-api.com', 'мяу'])(
    'rejects %j',
    (value) => {
      expect(validateApiUrl(value)).not.toBeNull()
    },
  )
})
