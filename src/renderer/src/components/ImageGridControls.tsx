import { Grid3X3, RotateCcw } from 'lucide-react';

import { useT } from '../i18n';
import type { QualityPreset } from '../types';

const LAYOUT_DEFAULTS = { border: 15, headerSpace: 25, titleFontSize: 14, fontSize: 8 };

const GRID_VALUES = [1, 2, 3, 4, 5, 6];
const gridOptionElements = GRID_VALUES.map(n => (
  <option key={n} value={n}>{n}</option>
));

interface ImageGridControlsProps {
  gridCols: number;
  gridRows: number;
  landscape: boolean;
  presets: QualityPreset[];
  activePresetId: string;
  fileCount: number;
  pdfBorder: number;
  pdfHeaderSpace: number;
  pdfFontSize: number;
  pdfTitleFontSize: number;
  onGridColsChange: (v: number) => void;
  onGridRowsChange: (v: number) => void;
  onLandscapeChange: (v: boolean) => void;
  onPresetSelect: (id: string) => void;
  onPdfBorderChange: (v: number) => void;
  onPdfHeaderSpaceChange: (v: number) => void;
  onPdfFontSizeChange: (v: number) => void;
  onPdfTitleFontSizeChange: (v: number) => void;
}

export function ImageGridControls({
  gridCols, gridRows, landscape, presets, activePresetId, fileCount,
  pdfBorder, pdfHeaderSpace, pdfFontSize, pdfTitleFontSize,
  onGridColsChange, onGridRowsChange, onLandscapeChange, onPresetSelect,
  onPdfBorderChange, onPdfHeaderSpaceChange, onPdfFontSizeChange, onPdfTitleFontSizeChange,
}: ImageGridControlsProps) {
  const { t } = useT();

  const isDefault = pdfBorder === LAYOUT_DEFAULTS.border &&
    pdfHeaderSpace === LAYOUT_DEFAULTS.headerSpace &&
    pdfTitleFontSize === LAYOUT_DEFAULTS.titleFontSize &&
    pdfFontSize === LAYOUT_DEFAULTS.fontSize;

  const resetDefaults = () => {
    onPdfBorderChange(LAYOUT_DEFAULTS.border);
    onPdfHeaderSpaceChange(LAYOUT_DEFAULTS.headerSpace);
    onPdfTitleFontSizeChange(LAYOUT_DEFAULTS.titleFontSize);
    onPdfFontSizeChange(LAYOUT_DEFAULTS.fontSize);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Grid3X3 size={16} className="text-brand" />
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t.gridLayout}</label>
      </div>

      {/* Grid size selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.columns}</label>
          <select
            value={gridCols}
            onChange={(e) => onGridColsChange(Number(e.target.value))}
            className="input-field"
          >
            {gridOptionElements}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.rows}</label>
          <select
            value={gridRows}
            onChange={(e) => onGridRowsChange(Number(e.target.value))}
            className="input-field"
          >
            {gridOptionElements}
          </select>
        </div>
      </div>

      {/* Orientation toggle */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.orientation}</label>
        <div className="flex gap-2">
          <button
            onClick={() => onLandscapeChange(false)}
            aria-label={t.portrait}
            aria-pressed={!landscape}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              !landscape
                ? 'bg-brand text-white shadow-md'
                : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-600'
            }`}
          >
            <div className="w-3 h-4 border-2 border-current rounded-sm" />
            {t.portrait}
          </button>
          <button
            onClick={() => onLandscapeChange(true)}
            aria-label={t.landscape}
            aria-pressed={landscape}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              landscape
                ? 'bg-brand text-white shadow-md'
                : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-600'
            }`}
          >
            <div className="w-4 h-3 border-2 border-current rounded-sm" />
            {t.landscape}
          </button>
        </div>
      </div>

      {/* Quality preset toggle */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.quality}</label>
        <div className="flex gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPresetSelect(preset.id)}
              aria-label={preset.name}
              aria-pressed={activePresetId === preset.id}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all truncate ${
                activePresetId === preset.id
                  ? 'bg-brand text-white shadow-md'
                  : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-600'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Layout settings — always visible, compact */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.layoutSettings}</label>
          {!isDefault && (
            <button
              onClick={resetDefaults}
              className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-brand transition-colors"
            >
              <RotateCcw size={10} />
              {t.defaults}
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 dark:text-gray-500">{t.borderMm}</label>
            <input
              type="number"
              min={5}
              max={30}
              step={1}
              value={pdfBorder}
              onChange={(e) => onPdfBorderChange(Math.min(30, Math.max(5, Number(e.target.value) || 5)))}
              className="input-field text-xs py-0.5 text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 dark:text-gray-500">{t.headerMm}</label>
            <input
              type="number"
              min={20}
              max={60}
              step={1}
              value={pdfHeaderSpace}
              onChange={(e) => onPdfHeaderSpaceChange(Math.min(60, Math.max(20, Number(e.target.value) || 20)))}
              className="input-field text-xs py-0.5 text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 dark:text-gray-500">{t.titlePt}</label>
            <input
              type="number"
              min={8}
              max={24}
              step={1}
              value={pdfTitleFontSize}
              onChange={(e) => onPdfTitleFontSizeChange(Math.min(24, Math.max(8, Number(e.target.value) || 8)))}
              className="input-field text-xs py-0.5 text-center"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 dark:text-gray-500">{t.fontPt}</label>
            <input
              type="number"
              min={6}
              max={14}
              step={1}
              value={pdfFontSize}
              onChange={(e) => onPdfFontSizeChange(Math.min(14, Math.max(6, Number(e.target.value) || 6)))}
              className="input-field text-xs py-0.5 text-center"
            />
          </div>
        </div>
      </div>

      {/* Live A4 Preview — mirrors sidecar LayoutConfig math */}
      {(() => {
        // A4 in mm
        const pageW = landscape ? 297 : 210;
        const pageH = landscape ? 210 : 297;

        // Mirror sidecar LayoutConfig
        const imgW = (pageW - (gridCols + 1) * pdfBorder) / gridCols;
        const imgH = ((pageH - pdfHeaderSpace) - (gridRows + 1) * pdfBorder) / gridRows;
        const contentTopOffset = pdfHeaderSpace - 10;
        const pageNumberY = 8;
        const filenameOffset = 5; // mm below cell, matches sidecar

        // Convert mm → percentage of page
        const pct = (v: number, total: number) => (v / total) * 100;

        // Preview container size in px (fixed outer dimensions)
        const previewW = landscape ? 144 : 102;
        const previewH = landscape ? 102 : 144;

        return (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.preview}</label>
            <div className="flex justify-center p-3 bg-white/30 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-lg">
              <div
                className="bg-white/80 dark:bg-white/10 backdrop-blur-md shadow-xl border border-white/40 dark:border-white/15 rounded transition-all duration-300 relative overflow-hidden"
                style={{ width: previewW, height: previewH }}
              >
                {/* Header zone — title bar centered between border and content top */}
                {(() => {
                  const zoneTop = pdfBorder;
                  const zoneBottom = contentTopOffset;
                  const zoneH = zoneBottom - zoneTop;
                  // Center the bar within the header zone
                  const barTop = zoneTop + zoneH / 2;
                  // Use a fixed pixel height so the bar is always visible at preview scale
                  const barPx = Math.max(2, previewH * 0.02);
                  return (
                    <div
                      className="absolute flex justify-center transition-all duration-300"
                      style={{
                        left: `${pct(pdfBorder, pageW)}%`,
                        right: `${pct(pdfBorder, pageW)}%`,
                        top: `${pct(barTop, pageH)}%`,
                        height: `${barPx}px`,
                      }}
                    >
                      <div
                        className="bg-gray-400/30 dark:bg-gray-500/30 rounded-sm h-full"
                        style={{ width: '60%' }}
                      />
                    </div>
                  );
                })()}

                {/* Image grid — absolutely positioned cells mirroring sidecar positions */}
                {Array.from({ length: gridCols * gridRows }).map((_, i) => {
                  const col = i % gridCols;
                  const row = Math.floor(i / gridCols);
                  const x = pdfBorder + col * (imgW + pdfBorder);
                  const pdfY = pageH - (row + 1) * imgH - (row + 1) * pdfBorder - contentTopOffset;
                  const cssTop = pageH - pdfY - imgH;

                  // Full slot = image + border below (the cell's "territory")
                  const slotH = imgH + pdfBorder;
                  // Filename bar height in mm (1pt = 0.353mm), clamped to border gap
                  const fnHeight = Math.min(pdfFontSize * 0.353, Math.max(0, pdfBorder - filenameOffset));
                  // Proportions within the slot
                  const imgPct = (imgH / slotH) * 100;
                  const gapPct = (filenameOffset / slotH) * 100;
                  const fnPct = (fnHeight / slotH) * 100;

                  return (
                    <div
                      key={i}
                      className="absolute flex flex-col transition-all duration-300"
                      style={{
                        left: `${pct(x, pageW)}%`,
                        top: `${pct(cssTop, pageH)}%`,
                        width: `${pct(imgW, pageW)}%`,
                        height: `${pct(slotH, pageH)}%`,
                      }}
                    >
                      {/* Image area */}
                      <div
                        className="bg-brand/20 dark:bg-brand/30 rounded-sm border border-brand/30 dark:border-brand/40 flex items-center justify-center"
                        style={{ height: `${imgPct}%` }}
                      >
                        <span className="text-[8px] font-bold text-brand/60 dark:text-brand/70">{i + 1}</span>
                      </div>
                      {/* Gap below image */}
                      <div style={{ height: `${gapPct}%` }} />
                      {/* Filename bar */}
                      <div className="flex justify-center" style={{ height: `${fnPct}%` }}>
                        <div
                          className="rounded-sm"
                          style={{
                            width: '70%',
                            height: '100%',
                            backgroundColor: 'var(--color-brand, #81bb00)',
                            opacity: 0.35,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Page number zone */}
                <div
                  className="absolute left-0 right-0 bottom-0 flex items-center justify-center"
                  style={{ height: `${pct(pageNumberY + 4, pageH)}%` }}
                >
                  <div
                    className="w-4 bg-gray-400/30 dark:bg-gray-500/30 rounded-sm"
                    style={{ height: Math.max(1, previewH * 0.015) }}
                  />
                </div>
              </div>
            </div>
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="font-bold text-brand">{gridCols * gridRows}</span> {t.imagesPerPage}
            </div>

            {fileCount > 0 && (() => {
              const pageCount = Math.ceil(fileCount / (gridCols * gridRows));
              return (
                <div className="mt-2 pt-2 border-t border-white/20 dark:border-white/10 text-center">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {pageCount} {pageCount === 1 ? t.page : t.pages}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}
