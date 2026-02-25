import { vi } from 'vitest'

export const app = {
  isPackaged: false,
  getPath: vi.fn(() => '/tmp'),
  getName: vi.fn(() => 'test-app')
}

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeHandler: vi.fn()
}

export const dialog = {
  showOpenDialog: vi.fn(),
  showMessageBox: vi.fn()
}

export const shell = {
  openPath: vi.fn(),
  showItemInFolder: vi.fn()
}

export const BrowserWindow = vi.fn()
