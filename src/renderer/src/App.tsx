import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings } from 'lucide-react';

import { ImageGridControls } from './components/ImageGridControls';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/ToastContainer';
import { HeaderBar } from './components/HeaderBar';
import { UploadZone } from './components/UploadZone';
import { FolderSectionsPanel } from './components/FolderSectionsPanel';
import { PdfOptionsBar } from './components/PdfOptionsBar';
import { GenerateSection } from './components/GenerateSection';
import { showToast } from './toast';
import { getDefaultOutputPath, buildFolderSections, isValidPreset } from './utils';
import { LanguageProvider, useT } from './i18n';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SUPPORTED_EXTENSIONS, getExtension, STORAGE_KEYS } from './constants';
import type { FileInfo, ProgressData, FolderSection, GenerateResult, QualityPreset } from './types';
import { FACTORY_PRESETS } from './types';

function AppContent() {
  const { t, lang } = useT();

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
  const [qualityPresets, setQualityPresets] = useLocalStorage<QualityPreset[]>(
    STORAGE_KEYS.qualityPresets,
    FACTORY_PRESETS,
    {
      validate: (v): v is QualityPreset[] =>
        Array.isArray(v) && v.length > 0 && v.every(isValidPreset),
      migrate: (presets) => {
        // Ensure all factory presets exist (handles upgrades adding new factory presets)
        const ids = new Set(presets.map((p) => p.id));
        const missing = FACTORY_PRESETS.filter((f) => !ids.has(f.id));
        if (missing.length === 0) return presets;
        const result = [...presets];
        for (const fp of missing) {
          const factoryIdx = FACTORY_PRESETS.indexOf(fp);
          result.splice(factoryIdx, 0, fp);
        }
        return result;
      },
    },
  );
  const [activePresetId, setActivePresetId] = useLocalStorage<string>(
    STORAGE_KEYS.activePresetId,
    'default',
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      const [topLevel, all] = await Promise.all([
        window.electronAPI.readFiles(path, false),
        window.electronAPI.readFiles(path, true),
      ]);
      if (all.length === 0) {
        showToast(t.noImagesFound, 'error');
        return;
      }
      const sep = path.includes('\\') ? '\\' : '/';
      const name = path.split(sep).pop() || t.folderFallback;
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

  const files = droppedFiles ?? (recursive ? allFiles : topLevelFiles);

  const handlePickFolder = useCallback(async () => {
    const path = await window.electronAPI.openFolder();
    if (path) {
      handleFolderSelected(path);
    }
  }, [handleFolderSelected]);

  const handleFilesDropped = useCallback(async (paths: string[]) => {
    const imagePaths = paths.filter((p) => SUPPORTED_EXTENSIONS.has(getExtension(p)));
    if (imagePaths.length === 0) {
      showToast(t.noImagesInDrop, 'error');
      return;
    }

    const newFiles: FileInfo[] = imagePaths.map((p) => {
      const sep = p.includes('/') ? '/' : '\\';
      return { name: p.substring(p.lastIndexOf(sep) + 1), path: p, size: 0 };
    });

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

      if (dirs.length === 1 && filePaths.length === 0) {
        handleFolderSelected(dirs[0]);
        return;
      }

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

  const handleClear = useCallback(() => {
    setDroppedFiles(null);
    setFolderPath(null);
    setFolderName(null);
    setTopLevelFiles([]);
    setAllFiles([]);
    setFolderSections([]);
    setLastResult(null);
  }, []);

  return (
    <div className="max-w-4xl mx-auto pt-2 pb-8 px-4">
      {/* Drag region for macOS traffic lights */}
      <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50" />

      <HeaderBar
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />

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
              <UploadZone
                isDragOver={isDragOver}
                isDroppedMode={isDroppedMode}
                droppedFiles={droppedFiles}
                allFiles={allFiles}
                topLevelFiles={topLevelFiles}
                recursive={recursive}
                folderName={folderName}
                files={files}
                totalSize={totalSize}
                isGenerating={isGenerating}
                onPickFolder={handlePickFolder}
                onClear={handleClear}
              />

              <FolderSectionsPanel
                hasSections={hasSections}
                folderSections={folderSections}
                perFolder={perFolder}
                pdfTitle={pdfTitle}
                showTitle={showTitle}
                folderName={folderName}
                onFolderSectionsChange={setFolderSections}
                onPdfTitleChange={setPdfTitle}
                onPerFolderChange={setPerFolder}
              />

              <PdfOptionsBar
                showTitle={showTitle}
                showPageNumbers={showPageNumbers}
                recursive={recursive}
                isDroppedMode={isDroppedMode}
                onShowTitleChange={setShowTitle}
                onShowPageNumbersChange={setShowPageNumbers}
                onRecursiveChange={setRecursive}
              />

              <GenerateSection
                isGenerating={isGenerating}
                progress={progress}
                lastResult={lastResult}
                fileCount={files.length}
                onGenerate={handleGenerate}
                onCancel={handleCancel}
              />
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
