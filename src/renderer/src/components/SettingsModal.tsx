import { useState } from 'react';
import { X, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useT } from '../i18n';
import type { QualityPreset } from '../types';
import { FACTORY_PRESETS } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: QualityPreset[];
  activePresetId: string;
  onPresetsChange: (presets: QualityPreset[]) => void;
  onActivePresetChange: (id: string) => void;
}

export function SettingsModal({ isOpen, onClose, presets, activePresetId, onPresetsChange, onActivePresetChange }: SettingsModalProps) {
  const { t } = useT();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleNameChange = (id: string, name: string) => {
    // Prevent empty names — keep at least 1 character
    if (name.length === 0) return;
    onPresetsChange(presets.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const handleQualityChange = (id: string, quality: number) => {
    onPresetsChange(presets.map((p) => (p.id === id ? { ...p, quality } : p)));
  };

  const handleCompressionChange = (id: string, jpegCompression: number) => {
    onPresetsChange(presets.map((p) => (p.id === id ? { ...p, jpegCompression } : p)));
  };

  const handleReset = (id: string) => {
    const factory = FACTORY_PRESETS.find((f) => f.id === id);
    if (!factory) return;
    onPresetsChange(presets.map((p) => (p.id === id ? { ...factory } : p)));
  };

  const handleDelete = (id: string) => {
    const remaining = presets.filter((p) => p.id !== id);
    onPresetsChange(remaining);
    if (activePresetId === id) {
      onActivePresetChange(remaining[0].id);
    }
  };

  const handleFactoryReset = () => {
    onPresetsChange([...FACTORY_PRESETS]);
    onActivePresetChange('default');
    setConfirmingReset(false);
  };

  const handleAdd = () => {
    if (presets.length >= 4) return;
    const newId = `custom-${Date.now()}`;
    onPresetsChange([
      ...presets,
      { id: newId, name: `Preset ${presets.length + 1}`, quality: 100, jpegCompression: 92, isFactory: false },
    ]);
  };

  const handleClose = () => { setConfirmingReset(false); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">{t.qualityPresets}</h2>
              <button
                onClick={handleClose}
                aria-label={t.close}
                className="p-1.5 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Preset list */}
            <div className="px-5 pb-2 space-y-3 max-h-[60vh] overflow-y-auto">
              {presets.map((preset, idx) => {
                const isDefault = preset.id === 'default';
                const isChanged = preset.isFactory && !isDefault && (() => {
                  const factory = FACTORY_PRESETS.find((f) => f.id === preset.id);
                  return factory && (
                    factory.name !== preset.name ||
                    factory.quality !== preset.quality ||
                    factory.jpegCompression !== preset.jpegCompression
                  );
                })();

                return (
                  <div key={preset.id}>
                    {idx > 0 && <div className="border-t border-white/20 dark:border-white/10 mb-3" />}

                    {isDefault ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{preset.name}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {preset.quality}% · JPEG {preset.jpegCompression}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Name + action */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={preset.name}
                            onChange={(e) => handleNameChange(preset.id, e.target.value)}
                            className="input-field text-xs py-1 flex-1 font-semibold"
                            placeholder={t.presetName}
                          />
                          {preset.isFactory ? (
                            <button
                              onClick={() => handleReset(preset.id)}
                              disabled={!isChanged}
                              aria-label={t.resetPreset}
                              title={t.resetPreset}
                              className="p-1 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <RotateCcw size={12} className="text-gray-500" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(preset.id)}
                              aria-label={t.deletePreset}
                              title={t.deletePreset}
                              className="p-1 rounded-md hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <Trash2 size={12} className="text-red-500" />
                            </button>
                          )}
                        </div>

                        {/* Sliders side by side */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="text-[10px] text-gray-500 dark:text-gray-400">{t.resolutionQuality}</label>
                              <span className="text-[10px] font-bold text-brand">{preset.quality}%</span>
                            </div>
                            <input
                              type="range"
                              min={50}
                              max={400}
                              step={10}
                              value={preset.quality}
                              onChange={(e) => handleQualityChange(preset.id, Number(e.target.value))}
                              className="w-full accent-brand h-1"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="text-[10px] text-gray-500 dark:text-gray-400">JPEG</label>
                              <span className="text-[10px] font-bold text-brand">{preset.jpegCompression}</span>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={100}
                              step={1}
                              value={preset.jpegCompression}
                              onChange={(e) => handleCompressionChange(preset.id, Number(e.target.value))}
                              className="w-full accent-brand h-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/20 dark:border-white/10 flex items-center gap-2">
              <button
                onClick={handleAdd}
                disabled={presets.length >= 4}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all
                  bg-white/50 dark:bg-white/5 border border-white/30 dark:border-white/10
                  hover:bg-brand/10 hover:border-brand/30
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
                {presets.length >= 4 ? t.maxPresetsReached : t.addPreset}
              </button>
              <div className="flex-1" />
              {confirmingReset ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{t.factoryResetConfirm}</span>
                  <button
                    onClick={handleFactoryReset}
                    className="px-2 py-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/30 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  >
                    {t.factoryReset}
                  </button>
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="px-2 py-1 text-[10px] font-semibold text-gray-500 bg-gray-100/50 dark:bg-neutral-700/50 rounded-md hover:bg-gray-200/50 dark:hover:bg-neutral-600/50 transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <RotateCcw size={10} />
                  {t.factoryReset}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
