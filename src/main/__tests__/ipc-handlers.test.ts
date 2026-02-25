import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  access: vi.fn()
}))

// Mock the sidecar module
vi.mock('../sidecar', () => ({
  generate: vi.fn(),
  cancel: vi.fn()
}))

import { readdir, stat, access } from 'fs/promises'
import { registerIpcHandlers } from '../ipc-handlers'

const mockedReaddir = vi.mocked(readdir)
const mockedStat = vi.mocked(stat)
const mockedAccess = vi.mocked(access)
const mockedHandle = vi.mocked(ipcMain.handle)

// Extract registered handlers after registerIpcHandlers() is called
function getHandler(channel: string): (...args: unknown[]) => unknown {
  const call = mockedHandle.mock.calls.find((c) => c[0] === channel)
  if (!call) throw new Error(`No handler registered for channel: ${channel}`)
  return call[1] as (...args: unknown[]) => unknown
}

describe('IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registerIpcHandlers()
  })

  describe('folder:readFiles', () => {
    it('returns supported image files', async () => {
      mockedReaddir.mockResolvedValue(['photo.jpg', 'image.png', 'readme.txt'] as any)
      mockedStat.mockImplementation(async (p) => {
        return { isFile: () => true, isDirectory: () => false, size: 1000 } as any
      })

      const handler = getHandler('folder:readFiles')
      const result = await handler({}, '/test/folder', false) as any[]

      const names = result.map((f: any) => f.name)
      expect(names).toContain('photo.jpg')
      expect(names).toContain('image.png')
      expect(names).not.toContain('readme.txt')
    })

    it('filters hidden files', async () => {
      mockedReaddir.mockResolvedValue(['.hidden.jpg', 'visible.jpg'] as any)
      mockedStat.mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 500 } as any)

      const handler = getHandler('folder:readFiles')
      const result = await handler({}, '/test/folder', false) as any[]

      const names = result.map((f: any) => f.name)
      expect(names).not.toContain('.hidden.jpg')
      expect(names).toContain('visible.jpg')
    })

    it('recurses into subdirectories when recursive=true', async () => {
      // First call: root dir
      mockedReaddir.mockResolvedValueOnce(['sub', 'root.jpg'] as any)
      // Second call: sub dir
      mockedReaddir.mockResolvedValueOnce(['nested.png'] as any)

      mockedStat.mockImplementation(async (p) => {
        const path = String(p)
        if (path.endsWith('/sub')) {
          return { isFile: () => false, isDirectory: () => true, size: 0 } as any
        }
        return { isFile: () => true, isDirectory: () => false, size: 1000 } as any
      })

      const handler = getHandler('folder:readFiles')
      const result = await handler({}, '/test', true) as any[]

      const names = result.map((f: any) => f.name)
      expect(names).toContain('root.jpg')
      expect(names).toContain('nested.png')
    })

    it('sorts results by name case-insensitively', async () => {
      mockedReaddir.mockResolvedValue(['Zebra.jpg', 'alpha.png', 'beta.tiff'] as any)
      mockedStat.mockResolvedValue({ isFile: () => true, isDirectory: () => false, size: 100 } as any)

      const handler = getHandler('folder:readFiles')
      const result = await handler({}, '/test', false) as any[]

      const names = result.map((f: any) => f.name)
      expect(names).toEqual(['alpha.png', 'beta.tiff', 'Zebra.jpg'])
    })

    it('handles stat errors gracefully', async () => {
      mockedReaddir.mockResolvedValue(['good.jpg', 'broken.jpg'] as any)
      mockedStat.mockImplementation(async (p) => {
        if (String(p).includes('broken')) throw new Error('Permission denied')
        return { isFile: () => true, isDirectory: () => false, size: 100 } as any
      })

      const handler = getHandler('folder:readFiles')
      const result = await handler({}, '/test', false) as any[]

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('good.jpg')
    })
  })

  describe('dialog:confirmOverwrite', () => {
    it('returns path directly when file does not exist', async () => {
      mockedAccess.mockRejectedValue(new Error('ENOENT'))

      const handler = getHandler('dialog:confirmOverwrite')
      const result = await handler({}, '/test/new-file.pdf')

      expect(result).toBe('/test/new-file.pdf')
    })
  })
})
