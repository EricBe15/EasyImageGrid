import { Upload, X } from 'lucide-react';
import { useT } from '../i18n';
import { formatFileSize } from '../utils';
import type { FileInfo } from '../types';

interface UploadZoneProps {
  isDragOver: boolean;
  isDroppedMode: boolean;
  droppedFiles: FileInfo[] | null;
  allFiles: FileInfo[];
  topLevelFiles: FileInfo[];
  recursive: boolean;
  folderName: string | null;
  files: FileInfo[];
  totalSize: number;
  isGenerating: boolean;
  onPickFolder: () => void;
  onClear: () => void;
}

export function UploadZone({
  isDragOver,
  isDroppedMode,
  droppedFiles,
  allFiles,
  topLevelFiles,
  recursive,
  folderName,
  files,
  totalSize,
  isGenerating,
  onPickFolder,
  onClear,
}: UploadZoneProps) {
  const { t } = useT();

  return (
    <div
      className="relative group cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={t.choose}
      onClick={isGenerating ? undefined : onPickFolder}
      onKeyDown={isGenerating ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPickFolder(); } }}
    >
      <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors bg-white/50 dark:bg-white/5 backdrop-blur-sm shadow-sm ${
        isDragOver
          ? 'border-brand bg-brand/5'
          : 'border-gray-300/60 dark:border-gray-600/40 group-hover:border-brand'
      }`}>
        <div className="w-10 h-10 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-2">
          <Upload size={20} />
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {isDroppedMode ? (
            <span className="text-center">
              <span className="font-bold text-brand">{droppedFiles!.length}</span> {t.files}
              {folderName && (
                <span> {t.in} <span className="font-bold">{folderName}</span></span>
              )}
            </span>
          ) : allFiles.length > 0 ? (
            <span className="text-center">
              <span className="font-bold text-brand">{files.length}</span> {t.images}
              {!recursive && allFiles.length > topLevelFiles.length && (
                <span className="opacity-60"> ({allFiles.length} {t.withSubfolders})</span>
              )}
              {folderName && (
                <span> {t.in} <span className="font-bold">{folderName}</span></span>
              )}
              <span className="block text-xs mt-1 opacity-60">
                ({formatFileSize(totalSize)})
              </span>
            </span>
          ) : t.choose}
        </span>
      </div>
      {/* Clear button to reset selection */}
      {!isGenerating && (isDroppedMode || allFiles.length > 0) && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute top-2 right-2 p-1 rounded-full bg-gray-500/20 hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-colors"
          aria-label={t.clearFiles}
          title={t.clearFiles}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
