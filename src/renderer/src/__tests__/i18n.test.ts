import { describe, it, expect } from 'vitest'
import { de, en } from '../i18n'

describe('i18n translations', () => {
  const deKeys = Object.keys(de).sort()
  const enKeys = Object.keys(en).sort()

  it('en has all keys from de', () => {
    for (const key of deKeys) {
      expect(enKeys).toContain(key)
    }
  })

  it('de has all keys from en', () => {
    for (const key of enKeys) {
      expect(deKeys).toContain(key)
    }
  })

  it('key sets are identical', () => {
    expect(deKeys).toEqual(enKeys)
  })

  it('no empty strings in de', () => {
    for (const [key, value] of Object.entries(de)) {
      expect(value, `de.${key} is empty`).not.toBe('')
    }
  })

  it('no empty strings in en', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key} is empty`).not.toBe('')
    }
  })

  it('interpolation tokens match between languages', () => {
    const tokenPattern = /\{(\w+)\}/g
    for (const key of deKeys) {
      const deTokens = [...(de as Record<string, string>)[key].matchAll(tokenPattern)]
        .map((m) => m[1])
        .sort()
      const enTokens = [...(en as Record<string, string>)[key].matchAll(tokenPattern)]
        .map((m) => m[1])
        .sort()
      expect(enTokens, `Token mismatch for key "${key}"`).toEqual(deTokens)
    }
  })
})
