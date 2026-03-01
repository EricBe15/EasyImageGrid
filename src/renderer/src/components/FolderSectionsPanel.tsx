import { Folder } from 'lucide-react';
import { useT } from '../i18n';
import type { FolderSection } from '../types';

interface FolderSectionsPanelProps {
  hasSections: boolean;
  folderSections: FolderSection[];
  perFolder: boolean;
  pdfTitle: string;
  showTitle: boolean;
  folderName: string | null;
  onFolderSectionsChange: (sections: FolderSection[]) => void;
  onPdfTitleChange: (title: string) => void;
  onPerFolderChange: (perFolder: boolean) => void;
}

export function FolderSectionsPanel({
  hasSections,
  folderSections,
  perFolder,
  pdfTitle,
  showTitle,
  folderName,
  onFolderSectionsChange,
  onPdfTitleChange,
  onPerFolderChange,
}: FolderSectionsPanelProps) {
  const { t } = useT();

  if (hasSections) {
    return (
      <div className="mt-1 p-2.5 rounded-lg bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10">
        <div className="flex items-center gap-1.5 mb-2">
          <Folder size={13} className="text-brand" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.folderSections}</span>
          <div className="ml-auto flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">
            <button
              onClick={() => onPerFolderChange(false)}
              aria-label={t.onePdf}
              aria-pressed={!perFolder}
              className={`px-2 py-0.5 rounded-l-md border transition-colors ${!perFolder ? 'bg-brand/20 border-brand/40 text-brand font-bold' : 'bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10'}`}
            >
              {t.onePdf}
            </button>
            <button
              onClick={() => onPerFolderChange(true)}
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
                  const updated = [...folderSections];
                  updated[idx] = { ...updated[idx], displayName: value };
                  onFolderSectionsChange(updated);
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
    );
  }

  return (
    <>
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.pdfTitle}</label>
      <input
        type="text"
        value={pdfTitle}
        onChange={(e) => onPdfTitleChange(e.target.value)}
        placeholder={folderName || t.pdfTitlePlaceholder}
        disabled={!showTitle}
        className="input-field text-xs py-2 mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </>
  );
}
