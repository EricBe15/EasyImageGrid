import { useT } from '../i18n';

interface PdfOptionsBarProps {
  showTitle: boolean;
  showPageNumbers: boolean;
  recursive: boolean;
  isDroppedMode: boolean;
  onShowTitleChange: (v: boolean) => void;
  onShowPageNumbersChange: (v: boolean) => void;
  onRecursiveChange: (v: boolean) => void;
}

export function PdfOptionsBar({
  showTitle,
  showPageNumbers,
  recursive,
  isDroppedMode,
  onShowTitleChange,
  onShowPageNumbersChange,
  onRecursiveChange,
}: PdfOptionsBarProps) {
  const { t } = useT();

  return (
    <div className="flex items-center gap-4 mt-1">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showTitle}
          onChange={(e) => onShowTitleChange(e.target.checked)}
          className="accent-brand w-3.5 h-3.5"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">{t.showTitleLabel}</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showPageNumbers}
          onChange={(e) => onShowPageNumbersChange(e.target.checked)}
          className="accent-brand w-3.5 h-3.5"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">{t.pageNumbers}</span>
      </label>
      <label className={`flex items-center gap-2 select-none ${isDroppedMode ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={isDroppedMode ? false : recursive}
          onChange={(e) => onRecursiveChange(e.target.checked)}
          disabled={isDroppedMode}
          className="accent-brand w-3.5 h-3.5"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400">{t.subfolders}</span>
      </label>
    </div>
  );
}
