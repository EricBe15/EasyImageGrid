import { Loader2, Grid3X3, Eye, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '../i18n';
import type { ProgressData, GenerateResult } from '../types';

interface GenerateSectionProps {
  isGenerating: boolean;
  progress: ProgressData | null;
  lastResult: GenerateResult | null;
  fileCount: number;
  onGenerate: () => void;
  onCancel: () => void;
}

export function GenerateSection({
  isGenerating,
  progress,
  lastResult,
  fileCount,
  onGenerate,
  onCancel,
}: GenerateSectionProps) {
  const { t } = useT();

  return (
    <>
      {/* Start Button */}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); onGenerate(); }}
          disabled={isGenerating || fileCount === 0}
          className="btn-primary flex-1 py-2.5 text-sm"
        >
          {isGenerating ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Grid3X3 size={18} />
          )}
          <span>{t.generateContactSheet}</span>
        </button>
      </div>

      {/* Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-2.5 rounded-lg bg-brand/5 border border-brand/20 space-y-2" role="status" aria-live="polite">
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin text-brand" size={14} />
                <span className="text-xs font-bold flex-1">
                  {progress
                    ? t.imageProgress.replace('{current}', String(progress.current)).replace('{total}', String(progress.total))
                    : t.generating}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onCancel(); }}
                  className="text-[10px] text-gray-500 hover:text-red-500 font-medium transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
              {progress && (
                <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%` }}
                    className="bg-brand h-full shadow-[0_0_10px_rgba(129,187,0,0.5)]"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result actions */}
      <AnimatePresence>
        {lastResult && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-green-500/10 dark:bg-green-500/5 border border-green-500/20">
              <span className="text-xs font-medium text-green-600 dark:text-green-400 truncate flex-1" title={lastResult.output}>
                {lastResult.files && lastResult.files.length > 1
                  ? t.pdfsCreated.replace('{count}', String(lastResult.files.length))
                  : t.pdfCreated}
              </span>
              {lastResult.files && lastResult.files.length > 1 ? (
                <button
                  onClick={(e) => { e.stopPropagation(); window.electronAPI.showInFolder(lastResult.files![0]); }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-brand hover:bg-brand-dark rounded-md hover:shadow-md transition-all"
                >
                  <FolderOpen size={12} />
                  {t.showInFolderLong}
                </button>
              ) : (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); window.electronAPI.openFile(lastResult.output); }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-brand hover:bg-brand-dark rounded-md hover:shadow-md transition-all"
                  >
                    <Eye size={12} />
                    {t.open}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); window.electronAPI.showInFolder(lastResult.output); }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-white/10 rounded-md hover:bg-white/70 dark:hover:bg-white/15 transition-all"
                  >
                    <FolderOpen size={12} />
                    {t.showInFolder}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
