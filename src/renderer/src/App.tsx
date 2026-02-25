import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  Sun,
  Moon,
  Loader2,
  Grid3X3,
  Eye,
  FolderOpen,
  Folder,
  X,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ImageGridControls } from './components/ImageGridControls';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/ToastContainer';
import { showToast } from './toast';
import { formatFileSize } from './utils';
import { LanguageProvider, useT } from './i18n';
import type { FileInfo, ProgressData, FolderSection, GenerateResult, QualityPreset } from './types';
import { FACTORY_PRESETS } from './types';

const STORAGE_KEYS = {
  theme: 'theme:v1',
  qualityPresets: 'qualityPresets:v1',
  activePresetId: 'activePresetId:v1',
} as const;

function isValidPreset(p: unknown): p is QualityPreset {
  return typeof p === 'object' && p !== null &&
    typeof (p as QualityPreset).id === 'string' &&
    typeof (p as QualityPreset).name === 'string' &&
    typeof (p as QualityPreset).quality === 'number' &&
    typeof (p as QualityPreset).jpegCompression === 'number';
}

const SUPPORTED_EXTENSIONS = new Set([
  '.tif', '.tiff', '.jpg', '.jpeg', '.png', '.webp',
  '.raw', '.cr2', '.cr3', '.nef', '.arw', '.dng',
  '.orf', '.rw2', '.raf', '.pef', '.srw',
]);

function getExtension(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot).toLowerCase() : '';
}

function getDefaultOutputPath(folderPath: string, folderName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${folderPath}/${folderName}_${date}.pdf`;
}

function buildFolderSections(files: FileInfo[], rootPath: string): FolderSection[] {
  const map = new Map<string, number>();
  for (const f of files) {
    // Get parent directory of this file
    const sep = f.path.includes('/') ? '/' : '\\';
    const parent = f.path.substring(0, f.path.lastIndexOf(sep));
    map.set(parent, (map.get(parent) || 0) + 1);
  }
  const sections: FolderSection[] = [];
  for (const [folderPath, count] of map) {
    // Display name = relative path from root, or folder basename for root itself
    let displayName: string;
    if (folderPath === rootPath) {
      const sep = folderPath.includes('/') ? '/' : '\\';
      displayName = folderPath.substring(folderPath.lastIndexOf(sep) + 1);
    } else {
      // Relative path from root
      const rel = folderPath.substring(rootPath.length + 1);
      displayName = rel;
    }
    sections.push({ folderPath, displayName, imageCount: count });
  }
  sections.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
  return sections;
}

function AppContent() {
  const { t, lang, setLang } = useT();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.theme);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch { /* ignore */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [topLevelFiles, setTopLevelFiles] = useState<FileInfo[]>([]);
  const [allFiles, setAllFiles] = useState<FileInfo[]>([]);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);

  const [pdfTitle, setPdfTitle] = useState('');
  const [gridCols, setGridCols] = useState(2);
  const [gridRows, setGridRows] = useState(3);
  const [landscape, setLandscape] = useState(false);
  const [qualityPresets, setQualityPresetsRaw] = useState<QualityPreset[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.qualityPresets);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidPreset)) {
          // Ensure all factory presets exist (handles upgrades adding new factory presets)
          const ids = new Set(parsed.map((p: QualityPreset) => p.id));
          const missing = FACTORY_PRESETS.filter((f) => !ids.has(f.id));
          if (missing.length > 0) {
            // Insert missing factory presets at their correct positions
            const result = [...parsed];
            for (const fp of missing) {
              const factoryIdx = FACTORY_PRESETS.indexOf(fp);
              result.splice(factoryIdx, 0, fp);
            }
            return result;
          }
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return FACTORY_PRESETS;
  });
  const setQualityPresets = useCallback((presets: QualityPreset[]) => {
    setQualityPresetsRaw(presets);
    try { localStorage.setItem(STORAGE_KEYS.qualityPresets, JSON.stringify(presets)); } catch { /* ignore */ }
  }, []);
  const [activePresetId, setActivePresetIdRaw] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.activePresetId);
      if (stored) return stored;
    } catch { /* ignore */ }
    return 'default';
  });
  const setActivePresetId = useCallback((id: string) => {
    setActivePresetIdRaw(id);
    try { localStorage.setItem(STORAGE_KEYS.activePresetId, id); } catch { /* ignore */ }
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // If the stored preset ID no longer exists (e.g. deleted in a previous session), fall back
  const resolvedPresetId = qualityPresets.some((p) => p.id === activePresetId) ? activePresetId : qualityPresets[0]?.id ?? 'default';
  const activePreset = qualityPresets.find((p) => p.id === resolvedPresetId) || qualityPresets[0];
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [recursive, setRecursive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [lastResult, setLastResult] = useState<GenerateResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [folderSections, setFolderSections] = useState<FolderSection[]>([]);
  const [perFolder, setPerFolder] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<FileInfo[] | null>(null);
  const [pdfBorder, setPdfBorder] = useState(15);
  const [pdfHeaderSpace, setPdfHeaderSpace] = useState(25);
  const [pdfFontSize, setPdfFontSize] = useState(8);
  const [pdfTitleFontSize, setPdfTitleFontSize] = useState(14);

  useEffect(() => {
    document.documentElement.className = theme;
    try { localStorage.setItem(STORAGE_KEYS.theme, theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => { isGeneratingRef.current = isGenerating; }, [isGenerating]);

  // Listen for sidecar progress
  useEffect(() => {
    const cleanup = window.electronAPI.onProgress((data) => {
      setProgress(data);
    });
    return cleanup;
  }, []);

  const handleFolderSelected = useCallback(async (path: string) => {
    try {
      // Always scan both top-level and recursive so the folder is accepted
      // even if only subfolders contain images
      const [topLevel, all] = await Promise.all([
        window.electronAPI.readFiles(path, false),
        window.electronAPI.readFiles(path, true),
      ]);
      if (all.length === 0) {
        showToast(t.noImagesFound, 'error');
        return;
      }
      const name = path.split('/').pop() || path.split('\\').pop() || t.folderFallback;
      setTopLevelFiles(topLevel);
      setAllFiles(all);
      setFolderPath(path);
      setFolderName(name);
      setFolderSections(buildFolderSections(all, path));
      setDroppedFiles(null);
      setLastResult(null);
      setProgress(null);
    } catch (err) {
      showToast(`${t.folderReadError}: ${err}`, 'error');
    }
  }, [t]);

  // Derive the active file list based on mode
  const files = droppedFiles ?? (recursive ? allFiles : topLevelFiles);

  const handlePickFolder = useCallback(async () => {
    const path = await window.electronAPI.openFolder();
    if (path) {
      handleFolderSelected(path);
    }
  }, [handleFolderSelected]);

  const handleFilesDropped = useCallback(async (paths: string[]) => {
    // Filter to supported image extensions
    const imagePaths = paths.filter((p) => SUPPORTED_EXTENSIONS.has(getExtension(p)));
    if (imagePaths.length === 0) {
      showToast(t.noImagesInDrop, 'error');
      return;
    }

    // Build FileInfo objects (size=0 is fine, we don't need it for generation)
    const newFiles: FileInfo[] = imagePaths.map((p) => {
      const sep = p.includes('/') ? '/' : '\\';
      return { name: p.substring(p.lastIndexOf(sep) + 1), path: p, size: 0 };
    });

    // Accumulate with previous dropped files, dedup by path
    setDroppedFiles((prev) => {
      const existing = new Set(prev?.map((f) => f.path) ?? []);
      const merged = [...(prev ?? [])];
      for (const f of newFiles) {
        if (!existing.has(f.path)) {
          merged.push(f);
          existing.add(f.path);
        }
      }
      return merged;
    });

    // Derive parent dir from first file
    const firstPath = imagePaths[0];
    const sep = firstPath.includes('/') ? '/' : '\\';
    const lastSep = firstPath.lastIndexOf(sep);
    const parentDir = lastSep > 0 ? firstPath.substring(0, lastSep) : firstPath.substring(0, lastSep + 1);
    const name = parentDir.substring(parentDir.lastIndexOf(sep) + 1) || parentDir;
    setFolderPath(parentDir);
    setFolderName(name);
    setLastResult(null);
    setProgress(null);
  }, [t]);

  // Global drag-and-drop on the whole window
  useEffect(() => {
    const onDragOver = (e: DragEvent): void => {
      e.preventDefault();
      setIsDragOver(true);
    };
    const onDragLeave = (e: DragEvent): void => {
      e.preventDefault();
      // Only hide when leaving the window (relatedTarget is null)
      if (!e.relatedTarget) setIsDragOver(false);
    };
    const onDrop = async (e: DragEvent): Promise<void> => {
      e.preventDefault();
      setIsDragOver(false);
      if (isGeneratingRef.current) return;
      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;

      const paths: string[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const p = window.electronAPI.getPathForFile(e.dataTransfer.files[i]);
        if (p) paths.push(p);
      }
      if (paths.length === 0) return;

      // Check which paths are directories
      const dirChecks = await Promise.all(paths.map((p) => window.electronAPI.isDirectory(p)));
      const dirs: string[] = [];
      const filePaths: string[] = [];
      for (let i = 0; i < paths.length; i++) {
        if (dirChecks[i]) {
          dirs.push(paths[i]);
        } else {
          filePaths.push(paths[i]);
        }
      }

      // Single directory dropped → folder mode
      if (dirs.length === 1 && filePaths.length === 0) {
        handleFolderSelected(dirs[0]);
        return;
      }

      // File(s) dropped (directories are ignored)
      if (filePaths.length > 0) {
        handleFilesDropped(filePaths);
      }
    };
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, [handleFolderSelected, handleFilesDropped]);

  const isDroppedMode = droppedFiles !== null;
  const hasSections = !isDroppedMode && recursive && folderSections.length > 1;

  const handleGenerate = useCallback(async () => {
    if (!folderPath || !folderName || files.length === 0) {
      showToast(t.selectFiles, 'error');
      return;
    }

    let outputPath: string;

    if (hasSections && perFolder) {
      // Per-folder mode: PDFs go into the root folder, no save dialog
      outputPath = folderPath;
    } else {
      const defaultPath = getDefaultOutputPath(folderPath, folderName);
      const chosen = await window.electronAPI.confirmOverwrite(defaultPath, lang);
      if (!chosen) return;
      outputPath = chosen;
    }

    setIsGenerating(true);
    setProgress(null);
    setLastResult(null);

    try {
      const result = await window.electronAPI.generate({
        inputDir: folderPath,
        outputPath,
        cols: gridCols,
        rows: gridRows,
        landscape,
        quality: activePreset.quality,
        jpegCompression: activePreset.jpegCompression,
        title: pdfTitle.trim() || undefined,
        showTitle,
        pageNumbers: showPageNumbers,
        recursive: isDroppedMode ? false : recursive,
        sections: hasSections ? folderSections : undefined,
        perFolder: hasSections && perFolder ? true : undefined,
        border: pdfBorder,
        headerSpace: pdfHeaderSpace,
        filenameFontSize: pdfFontSize,
        titleFontSize: pdfTitleFontSize,
        inputFiles: isDroppedMode ? droppedFiles.map((f) => f.path) : undefined,
      });

      setLastResult(result);
      if (result.files && result.files.length > 1) {
        showToast(
          `${t.pdfsCreated.replace('{count}', String(result.files.length))} (${t.pagesTotal.replace('{pages}', String(result.pages))})`,
          'success'
        );
      } else {
        showToast(
          `${t.contactSheetCreated} (${result.pages} ${result.pages === 1 ? t.page : t.pages})`,
          'success'
        );
      }
    } catch (err) {
      showToast(`${t.error}: ${err instanceof Error ? err.message : err}`, 'error');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [folderPath, folderName, files, gridCols, gridRows, landscape, activePreset, pdfTitle, showPageNumbers, showTitle, recursive, folderSections, hasSections, perFolder, pdfBorder, pdfHeaderSpace, pdfFontSize, pdfTitleFontSize, isDroppedMode, droppedFiles, t, lang]);

  const handleCancel = useCallback(async () => {
    await window.electronAPI.cancelGenerate();
    setIsGenerating(false);
    setProgress(null);
    showToast(t.cancelled, 'info');
  }, [t]);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="max-w-4xl mx-auto pt-2 pb-8 px-4">
      {/* Drag region for macOS traffic lights */}
      <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />

      {/* Header — Dynamic Island style, overlaps card */}
      <div className="relative z-10 flex justify-center mb-[-20px]">
        <header className="relative bg-neutral-800/70 backdrop-blur-xl border border-white/10 py-2.5 px-6 rounded-full text-white shadow-xl overflow-hidden flex items-center gap-3">
          <h1 className="text-sm font-bold">{t.title}</h1>
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            aria-label={t.langToggle}
            className="px-2 py-1 text-[10px] font-bold bg-white/15 hover:bg-white/25 rounded-full border border-white/20 backdrop-blur-md transition-all uppercase tracking-wider"
          >
            {lang}
          </button>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={t.darkModeToggle}
            className="p-1.5 bg-white/15 hover:bg-white/25 rounded-full border border-white/20 backdrop-blur-md transition-all"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </header>
      </div>

      <main className="card pt-10 px-6 pb-6 shadow-2xl relative">
        {/* Settings gear icon */}
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label={t.settings}
          title={t.settings}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors z-10"
        >
          <Settings size={16} className="text-gray-400 dark:text-gray-500" />
        </button>

        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          presets={qualityPresets}
          activePresetId={resolvedPresetId}
          onPresetsChange={setQualityPresets}
          onActivePresetChange={setActivePresetId}
        />

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {/* Upload zone — replaces file input with click-to-open + drag-drop */}
              <div
                className="relative group cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={t.choose}
                onClick={isGenerating ? undefined : handlePickFolder}
                onKeyDown={isGenerating ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePickFolder(); } }}
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
                        <span className="font-bold text-brand">{droppedFiles.length}</span> {t.files}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setDroppedFiles(null);
                      setFolderPath(null);
                      setFolderName(null);
                      setTopLevelFiles([]);
                      setAllFiles([]);
                      setFolderSections([]);
                      setLastResult(null);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-gray-500/20 hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-colors"
                    aria-label={t.clearFiles}
                    title={t.clearFiles}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* PDF title or folder sections list */}
              {hasSections ? (
                <div className="mt-1 p-2.5 rounded-lg bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Folder size={13} className="text-brand" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.folderSections}</span>
                    <div className="ml-auto flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => setPerFolder(false)}
                        aria-label={t.onePdf}
                        aria-pressed={!perFolder}
                        className={`px-2 py-0.5 rounded-l-md border transition-colors ${!perFolder ? 'bg-brand/20 border-brand/40 text-brand font-bold' : 'bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10'}`}
                      >
                        {t.onePdf}
                      </button>
                      <button
                        onClick={() => setPerFolder(true)}
                        aria-label={t.pdfPerFolder}
                        aria-pressed={perFolder}
                        className={`px-2 py-0.5 rounded-r-md border border-l-0 transition-colors ${perFolder ? 'bg-brand/20 border-brand/40 text-brand font-bold' : 'bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10'}`}
                      >
                        {t.pdfPerFolder}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {folderSections.map((section, idx) => (
                      <div key={section.folderPath} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={section.displayName}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFolderSections(prev => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], displayName: value };
                              return updated;
                            });
                          }}
                          className="input-field text-xs py-1 flex-1 min-w-0"
                        />
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {section.imageCount} {section.imageCount === 1 ? t.image : t.imagesPl}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.pdfTitle}</label>
                  <input
                    type="text"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    placeholder={folderName || t.pdfTitlePlaceholder}
                    disabled={!showTitle}
                    className="input-field text-xs py-2 mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </>
              )}

              {/* PDF options toggles */}
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTitle}
                    onChange={(e) => setShowTitle(e.target.checked)}
                    className="accent-brand w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{t.showTitleLabel}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPageNumbers}
                    onChange={(e) => setShowPageNumbers(e.target.checked)}
                    className="accent-brand w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{t.pageNumbers}</span>
                </label>
                <label className={`flex items-center gap-2 select-none ${isDroppedMode ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={isDroppedMode ? false : recursive}
                    onChange={(e) => setRecursive(e.target.checked)}
                    disabled={isDroppedMode}
                    className="accent-brand w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{t.subfolders}</span>
                </label>
              </div>

              {/* Start Button */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
                  disabled={isGenerating || files.length === 0}
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

              {/* Progress — inline below generate button */}
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
                          onClick={(e) => { e.stopPropagation(); handleCancel(); }}
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

              {/* Result actions — inline below generate button */}
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
            </div>

            {/* Right column - Grid selector */}
            <div className="flex flex-col">
              <ImageGridControls
                gridCols={gridCols}
                gridRows={gridRows}
                landscape={landscape}
                presets={qualityPresets}
                activePresetId={resolvedPresetId}
                fileCount={files.length}
                pdfBorder={pdfBorder}
                pdfHeaderSpace={pdfHeaderSpace}
                pdfFontSize={pdfFontSize}
                pdfTitleFontSize={pdfTitleFontSize}
                onGridColsChange={setGridCols}
                onGridRowsChange={setGridRows}
                onLandscapeChange={setLandscape}
                onPresetSelect={setActivePresetId}
                onPdfBorderChange={setPdfBorder}
                onPdfHeaderSpaceChange={setPdfHeaderSpace}
                onPdfFontSizeChange={setPdfFontSize}
                onPdfTitleFontSizeChange={setPdfTitleFontSize}
              />
            </div>
          </div>
        </section>

        {/* Footer inside card */}
        <div className="pt-4 border-t border-white/20 dark:border-white/10 text-center text-gray-400 dark:text-gray-600">
          <p className="text-[10px] font-medium">{t.footer}</p>
        </div>
      </main>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
