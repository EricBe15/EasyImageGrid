export function formatFileSize(bytes: number, precision?: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(precision ?? 1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(precision ?? 1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(precision ?? 2)} GB`
}
