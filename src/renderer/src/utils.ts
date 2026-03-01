import type { FileInfo, FolderSection, QualityPreset } from './types';

export function formatFileSize(bytes: number, precision?: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(precision ?? 1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(precision ?? 1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(precision ?? 2)} GB`
}

export function getDefaultOutputPath(folderPath: string, folderName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const sep = folderPath.includes('\\') ? '\\' : '/';
  return `${folderPath}${sep}${folderName}_${date}.pdf`;
}

export function buildFolderSections(files: FileInfo[], rootPath: string): FolderSection[] {
  const map = new Map<string, number>();
  for (const f of files) {
    const sep = f.path.includes('/') ? '/' : '\\';
    const parent = f.path.substring(0, f.path.lastIndexOf(sep));
    map.set(parent, (map.get(parent) || 0) + 1);
  }
  const sections: FolderSection[] = [];
  for (const [folderPath, count] of map) {
    let displayName: string;
    if (folderPath === rootPath) {
      const sep = folderPath.includes('/') ? '/' : '\\';
      displayName = folderPath.substring(folderPath.lastIndexOf(sep) + 1);
    } else {
      const rel = folderPath.substring(rootPath.length + 1);
      displayName = rel;
    }
    sections.push({ folderPath, displayName, imageCount: count });
  }
  sections.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
  return sections;
}

export function isValidPreset(p: unknown): p is QualityPreset {
  return typeof p === 'object' && p !== null &&
    typeof (p as QualityPreset).id === 'string' &&
    typeof (p as QualityPreset).name === 'string' &&
    typeof (p as QualityPreset).quality === 'number' &&
    typeof (p as QualityPreset).jpegCompression === 'number';
}
