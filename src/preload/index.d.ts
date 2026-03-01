interface FileInfo {
  name: string
  path: string
  size: number
}

interface FolderSection {
  folderPath: string
  displayName: string
  imageCount: number
}

interface GenerateParams {
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
  inputFiles?: string[]
  jpegCompression?: number
}

interface GenerateResult {
  type: 'done'
  output: string
  pages: number
  files?: string[]
}

interface ProgressData {
  type: 'progress'
  current: number
  total: number
  file: string
}

interface ElectronAPI {
  openFolder: () => Promise<string | null>
  readFiles: (folderPath: string, recursive?: boolean) => Promise<FileInfo[]>
  confirmOverwrite: (filePath: string, lang?: string) => Promise<string | null>
  generate: (params: GenerateParams) => Promise<GenerateResult>
  cancelGenerate: () => Promise<void>
  onProgress: (callback: (data: ProgressData) => void) => () => void
  openFile: (filePath: string) => Promise<void>
  showInFolder: (filePath: string) => Promise<void>
  getPathForFile: (file: File) => string
  isDirectory: (filePath: string) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
