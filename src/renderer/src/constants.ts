export const SUPPORTED_EXTENSIONS = new Set([
  '.tif', '.tiff', '.jpg', '.jpeg', '.png', '.webp',
  '.raw', '.cr2', '.cr3', '.nef', '.arw', '.dng',
  '.orf', '.rw2', '.raf', '.pef', '.srw',
]);

export function getExtension(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot).toLowerCase() : '';
}

export const STORAGE_KEYS = {
  theme: 'theme:v1',
  qualityPresets: 'qualityPresets:v1',
  activePresetId: 'activePresetId:v1',
} as const;
