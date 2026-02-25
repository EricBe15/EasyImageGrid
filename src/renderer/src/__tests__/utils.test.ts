import { describe, it, expect } from 'vitest'
import { formatFileSize } from '../utils'

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB')
  })

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB')
    expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB')
  })

  it('handles zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('respects custom precision for KB', () => {
    expect(formatFileSize(1536, 2)).toBe('1.50 KB')
  })

  it('respects custom precision for MB', () => {
    expect(formatFileSize(5.5 * 1024 * 1024, 0)).toBe('6 MB')
  })

  it('respects custom precision for GB', () => {
    expect(formatFileSize(2.5 * 1024 * 1024 * 1024, 1)).toBe('2.5 GB')
  })

  it('boundary between bytes and KB', () => {
    expect(formatFileSize(1023)).toBe('1023 B')
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  it('boundary between KB and MB', () => {
    expect(formatFileSize(1024 * 1024 - 1)).toContain('KB')
    expect(formatFileSize(1024 * 1024)).toContain('MB')
  })
})
