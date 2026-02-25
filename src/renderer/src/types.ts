export interface QualityPreset {
  id: string
  name: string
  quality: number
  jpegCompression: number
  isFactory: boolean
}

export const FACTORY_PRESETS: QualityPreset[] = [
  { id: 'default', name: 'Default', quality: 100, jpegCompression: 92, isFactory: true },
  { id: 'highres', name: 'High Res', quality: 200, jpegCompression: 92, isFactory: true },
]

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

export interface ProgressData {
  type: 'progress'
  current: number
  total: number
  file: string
}

export interface GenerateResult {
  type: 'done'
  output: string
  pages: number
  files?: string[]
}