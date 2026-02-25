import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { access, readdir, stat } from 'fs/promises'
import { basename, join, extname } from 'path'
import { generate, cancel } from './sidecar'
import type { GenerateParams } from './sidecar'

const SUPPORTED_EXTENSIONS = new Set([
  '.tif', '.tiff', '.jpg', '.jpeg', '.png', '.webp',
  '.raw', '.cr2', '.cr3', '.nef', '.arw', '.dng',
  '.orf', '.rw2', '.raf', '.pef', '.srw',
])

interface FileInfo {
  name: string
  path: string
  size: number
}

let mainWindowRef: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindowRef = win
}

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openFolder', async () => {
    if (!mainWindowRef) return null
    const result = await dialog.showOpenDialog(mainWindowRef, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('folder:readFiles', async (_event, folderPath: string, recursive: boolean = false): Promise<FileInfo[]> => {
    const files: FileInfo[] = []

    async function scanDir(dirPath: string): Promise<void> {
      const entries = await readdir(dirPath)
      const tasks = entries.map(async (entry) => {
        if (entry.startsWith('.')) return
        const fullPath = join(dirPath, entry)
        try {
          const fileStat = await stat(fullPath)
          if (fileStat.isDirectory() && recursive) {
            await scanDir(fullPath)
          } else if (fileStat.isFile()) {
            const ext = extname(entry).toLowerCase()
            if (SUPPORTED_EXTENSIONS.has(ext)) {
              files.push({ name: entry, path: fullPath, size: fileStat.size })
            }
          }
        } catch {
          // Skip files that can't be stat'd (broken symlinks, permission errors)
        }
      })
      await Promise.all(tasks)
    }

    await scanDir(folderPath)
    files.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    return files
  })

  ipcMain.handle('dialog:confirmOverwrite', async (_event, filePath: string, lang?: string): Promise<string | null> => {
    try {
      await access(filePath)
    } catch {
      return filePath // file doesn't exist, proceed as-is
    }
    if (!mainWindowRef) return filePath
    const isDE = lang === 'de'
    const result = await dialog.showMessageBox(mainWindowRef, {
      type: 'warning',
      buttons: isDE
        ? ['Überschreiben', 'Beide behalten', 'Abbrechen']
        : ['Overwrite', 'Keep both', 'Cancel'],
      defaultId: 2,
      cancelId: 2,
      title: isDE ? 'Datei existiert bereits' : 'File already exists',
      message: isDE
        ? `„${basename(filePath)}" existiert bereits.`
        : `"${basename(filePath)}" already exists.`,
      detail: isDE
        ? 'Möchten Sie die vorhandene Datei überschreiben oder beide behalten?'
        : 'Would you like to overwrite the existing file or keep both?',
    })
    if (result.response === 0) return filePath // overwrite
    if (result.response === 1) {
      // Find next available filename: name_2.pdf, name_3.pdf, ...
      const ext = extname(filePath)
      const base = filePath.slice(0, -ext.length)
      let n = 2
      let candidate = `${base}_${n}${ext}`
      while (n <= 1000) {
        try {
          await access(candidate)
          n++
          candidate = `${base}_${n}${ext}`
        } catch {
          return candidate
        }
      }
      return null // too many existing files
    }
    return null // cancelled
  })

  ipcMain.handle('sidecar:generate', async (_event, params: GenerateParams) => {
    return new Promise<unknown>((resolve, reject) => {
      generate(
        params,
        (progress) => {
          mainWindowRef?.webContents.send('sidecar:progress', progress)
        },
        (errorMessage) => {
          reject(new Error(errorMessage))
        },
        (result) => {
          resolve(result)
        }
      )
    })
  })

  ipcMain.handle('sidecar:cancel', () => {
    cancel()
  })

  ipcMain.handle('shell:openFile', async (_event, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('shell:showInFolder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('fs:isDirectory', async (_event, filePath: string): Promise<boolean> => {
    try {
      const fileStat = await stat(filePath)
      return fileStat.isDirectory()
    } catch {
      return false
    }
  })
}
