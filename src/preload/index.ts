import { contextBridge, ipcRenderer, webUtils } from 'electron'

export interface FileInfo {
  name: string
  path: string
  size: number
}

export interface FolderSection {
  folderPath: string
  displayName: string
  imageCount: number
}

export interface GenerateParams {
  inputDir: string
  outputPath: string
  cols: number
  rows: number
  landscape: boolean
  quality: number
  title?: string
  showTitle?: boolean
  pageNumbers?: boolean
  recursive?: boolean
  sections?: FolderSection[]
  perFolder?: boolean
  border?: number
  headerSpace?: number
  filenameFontSize?: number
  titleFontSize?: number
  benchmark?: boolean
  inputFiles?: string[]
  jpegCompression?: number
}

export interface GenerateResult {
  type: 'done'
  output: string
  pages: number
  files?: string[]
}

const electronAPI = {
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),

  readFiles: (folderPath: string, recursive?: boolean): Promise<FileInfo[]> =>
    ipcRenderer.invoke('folder:readFiles', folderPath, recursive ?? false),

  confirmOverwrite: (filePath: string, lang?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:confirmOverwrite', filePath, lang),

  generate: (params: GenerateParams): Promise<GenerateResult> =>
    ipcRenderer.invoke('sidecar:generate', params),

  cancelGenerate: (): Promise<void> => ipcRenderer.invoke('sidecar:cancel'),

  onProgress: (callback: (data: { type: string; current: number; total: number; file: string }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { type: string; current: number; total: number; file: string }): void => {
      callback(data)
    }
    ipcRenderer.on('sidecar:progress', handler)
    return () => {
      ipcRenderer.removeListener('sidecar:progress', handler)
    }
  },

  openFile: (filePath: string): Promise<void> => ipcRenderer.invoke('shell:openFile', filePath),

  showInFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('shell:showInFolder', filePath),

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  isDirectory: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('fs:isDirectory', filePath)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
