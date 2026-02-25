import { describe, it, expect, vi, beforeEach } from 'vitest'
import { showToast, setToastListener, type ToastMessage } from '../toast'

describe('toast pub/sub', () => {
  beforeEach(() => {
    setToastListener(null)
  })

  it('calls listener with correct shape', () => {
    const listener = vi.fn()
    setToastListener(listener)
    showToast('Hello', 'success')

    expect(listener).toHaveBeenCalledTimes(1)
    const toast: ToastMessage = listener.mock.calls[0][0]
    expect(toast.message).toBe('Hello')
    expect(toast.type).toBe('success')
    expect(typeof toast.id).toBe('number')
  })

  it('increments IDs', () => {
    const listener = vi.fn()
    setToastListener(listener)
    showToast('First')
    showToast('Second')

    const id1 = listener.mock.calls[0][0].id
    const id2 = listener.mock.calls[1][0].id
    expect(id2).toBeGreaterThan(id1)
  })

  it('defaults type to info', () => {
    const listener = vi.fn()
    setToastListener(listener)
    showToast('Test')

    expect(listener.mock.calls[0][0].type).toBe('info')
  })

  it('does not error without a listener', () => {
    expect(() => showToast('No listener')).not.toThrow()
  })

  it('supports error type', () => {
    const listener = vi.fn()
    setToastListener(listener)
    showToast('Error!', 'error')

    expect(listener.mock.calls[0][0].type).toBe('error')
  })

  it('clearing listener stops notifications', () => {
    const listener = vi.fn()
    setToastListener(listener)
    showToast('Before')
    setToastListener(null)
    showToast('After')

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
