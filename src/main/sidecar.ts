import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'

// Check if running in development
const isDev = !app.isPackaged

let currentProcess: ChildProcess | null = null

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
  inputFiles?: string[]
  jpegCompression?: number
}

function getSidecarPath(): { command: string; args: string[] } {
  const ext = process.platform === 'win32' ? '.exe' : ''
  if (isDev) {
    const binary = join(process.cwd(), 'sidecar-cs', 'dist', `easyimagegrid-sidecar${ext}`)
    return { command: binary, args: [] }
  }
  const sidecarBinary = join(process.resourcesPath, 'sidecar', `easyimagegrid-sidecar${ext}`)
  return {
    command: sidecarBinary,
    args: []
  }
}

export function buildArgs(params: GenerateParams): string[] {
  const args = [
    '--input-dir', params.inputDir,
    '--output', params.outputPath,
    '--cols', String(params.cols),
    '--rows', String(params.rows),
    '--quality', String(params.quality)
  ]

  if (params.landscape) {
    args.push('--landscape')
  }

  if (params.showTitle === false) {
    args.push('--no-title')
  } else if (params.title) {
    args.push('--title', params.title)
  }

  if (params.pageNumbers === false) {
    args.push('--no-page-numbers')
  }

  if (params.recursive) {
    args.push('--recursive')
  }

  if (params.border !== undefined) {
    args.push('--border', String(params.border))
  }

  if (params.headerSpace !== undefined) {
    args.push('--header-space', String(params.headerSpace))
  }

  if (params.filenameFontSize !== undefined) {
    args.push('--filename-font-size', String(params.filenameFontSize))
  }

  if (params.titleFontSize !== undefined) {
    args.push('--title-font-size', String(params.titleFontSize))
  }

  if (params.inputFiles && params.inputFiles.length > 0) {
    args.push('--files-from-stdin')
  } else if (params.sections && params.sections.length > 1) {
    args.push('--sections-from-stdin')
    if (params.perFolder) {
      args.push('--per-folder')
    }
  }

  if (params.jpegCompression !== undefined) {
    args.push('--jpeg-compression', String(params.jpegCompression))
  }

  return args
}

export function generate(
  params: GenerateParams,
  onProgress: (data: unknown) => void,
  onError: (message: string) => void,
  onDone: (data: unknown) => void
): void {
  // Kill any previously running sidecar to prevent orphaned processes
  if (currentProcess) {
    currentProcess.kill('SIGTERM')
    currentProcess = null
  }

  const { command, args: baseArgs } = getSidecarPath()

  const args = [...baseArgs, ...buildArgs(params)]
  let settled = false

  const proc = spawn(command, args, {
    stdio: ['pipe', 'pipe', 'pipe']
  })

  currentProcess = proc

  // Ignore EPIPE errors on stdin (process may exit before we finish writing)
  proc.stdin?.on('error', () => { /* ignore EPIPE */ })

  // Send data via stdin
  if (params.inputFiles && params.inputFiles.length > 0) {
    proc.stdin?.write(JSON.stringify(params.inputFiles))
    proc.stdin?.end()
  } else if (params.sections && params.sections.length > 1) {
    const sectionsData = params.sections.map((s) => ({
      folder_path: s.folderPath,
      display_name: s.displayName
    }))
    proc.stdin?.write(JSON.stringify(sectionsData))
    proc.stdin?.end()
  }

  // Cap stderr buffer to avoid unbounded memory growth
  const MAX_STDERR = 1024 * 1024 // 1 MB
  let stderrBuffer = ''
  let stdoutLineBuffer = ''

  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutLineBuffer += chunk.toString()
    const lines = stdoutLineBuffer.split('\n')
    // Keep the last (possibly incomplete) fragment for the next chunk
    stdoutLineBuffer = lines.pop() || ''
    for (const line of lines) {
      if (!line) continue
      try {
        const data = JSON.parse(line)
        if (data.type === 'progress') {
          onProgress(data)
        } else if (data.type === 'done') {
          settled = true
          onDone(data)
        }
      } catch {
        // Non-JSON output, ignore
      }
    }
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    if (stderrBuffer.length < MAX_STDERR) {
      stderrBuffer += chunk.toString()
    }
  })

  proc.on('close', (code) => {
    // Clear ref only if this is still the active process
    if (currentProcess === proc) currentProcess = null
    if (settled) return
    // If killed (cancelled), resolve with a cancellation error
    if (proc.killed) {
      onError('Generation cancelled')
      return
    }
    if (code !== 0 && code !== null) {
      // Try to parse stderr as JSON error
      try {
        const lines = stderrBuffer.split('\n').filter(Boolean)
        for (const line of lines) {
          const data = JSON.parse(line)
          if (data.type === 'error') {
            onError(data.message)
            return
          }
        }
      } catch {
        // Fall through
      }
      onError(stderrBuffer || `Sidecar exited with code ${code}`)
    }
  })

  proc.on('error', (err) => {
    if (currentProcess === proc) currentProcess = null
    if (settled || proc.killed) return
    onError(`Failed to start sidecar: ${err.message}`)
  })
}

export function cancel(): void {
  if (currentProcess) {
    currentProcess.kill('SIGTERM')
    currentProcess = null
  }
}
