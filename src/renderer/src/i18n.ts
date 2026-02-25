import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import React from 'react';

export const de = {
  // App header & general
  title: 'EasyImageGrid',
  darkModeToggle: 'Dunkelmodus umschalten',

  // Folder selection
  choose: 'Dateien & Ordner auswählen oder ablegen',
  chooseOrDrop: 'Ordner oder Dateien hierher ziehen',
  images: 'Bilder',
  files: 'Dateien',
  withSubfolders: 'mit Unterordner',
  in: 'in',
  noImagesFound: 'Keine kompatiblen Bilder im Ordner gefunden.',
  noImagesInDrop: 'Keine kompatiblen Bilddateien abgelegt.',
  folderReadError: 'Fehler beim Lesen des Ordners',
  folderFallback: 'Ordner',
  clearFiles: 'Dateien zurücksetzen',

  // Sections panel
  folderSections: 'Ordner-Abschnitte',
  onePdf: 'Ein PDF',
  pdfPerFolder: 'PDF pro Ordner',
  image: 'Bild',
  imagesPl: 'Bilder',

  // PDF options
  pdfTitle: 'PDF-Titel',
  pdfTitlePlaceholder: 'PDF-Titel (optional)',
  showTitleLabel: 'Titel anzeigen',
  pageNumbers: 'Seitenzahlen',
  subfolders: 'Unterordner',

  // Grid controls
  gridLayout: 'Einstellungen',
  columns: 'Spalten',
  rows: 'Zeilen',
  orientation: 'Ausrichtung',
  portrait: 'Hochformat',
  landscape: 'Querformat',
  quality: 'Qualität',
  preview: 'Vorschau',

  // Quality toggle
  qualityDefault: 'Standard',
  qualityHighRes: 'High Res',

  // Layout settings
  layoutSettings: 'Layout-Einstellungen',
  borderMm: 'Rand (mm)',
  headerMm: 'Kopfz. (mm)',
  titlePt: 'Titel (pt)',
  fontPt: 'Schrift (pt)',
  defaults: 'Standard',
  imagesPerPage: 'Bilder pro Seite',
  page: 'Seite',
  pages: 'Seiten',

  // Generate & progress
  generateContactSheet: 'Kontaktbogen generieren',
  selectFiles: 'Bitte wählen Sie Dateien aus',
  generating: 'Generiere...',
  imageProgress: 'Bild {current} / {total}',
  cancel: 'Abbrechen',
  cancelled: 'Generierung abgebrochen.',

  // Result actions
  pdfCreated: 'PDF erstellt',
  pdfsCreated: '{count} PDFs erstellt',
  pagesTotal: '{pages} Seiten gesamt',
  contactSheetCreated: 'Kontaktbogen erstellt',
  open: 'Öffnen',
  showInFolder: 'Zeigen',
  showInFolderLong: 'Im Ordner zeigen',

  // Footer
  footer: '© 2026 E.-D. Beisswenger · EasyImageGrid v2.0',

  // Error
  error: 'Fehler',

  // Settings modal
  settings: 'Einstellungen',
  qualityPresets: 'Qualitätsvorlagen',
  presetName: 'Name',
  resolutionQuality: 'Auflösung',
  jpegCompression: 'JPEG-Kompression',
  resetPreset: 'Vorlage zurücksetzen',
  deletePreset: 'Vorlage löschen',
  addPreset: 'Vorlage hinzufügen',
  maxPresetsReached: 'Maximal 4 Vorlagen',
  factoryReset: 'Auf Werkseinstellungen zurücksetzen',
  factoryResetConfirm: 'Alle Vorlagen auf Werkseinstellungen zurücksetzen?',
  close: 'Schließen',

  // Accessibility
  langToggle: 'Auf Englisch wechseln',
};

export const en: typeof de = {
  // App header & general
  title: 'EasyImageGrid',
  darkModeToggle: 'Toggle dark mode',

  // Folder selection
  choose: 'Choose or drop files and folders',
  chooseOrDrop: 'Drop folder or files here',
  images: 'images',
  files: 'files',
  withSubfolders: 'with subfolders',
  in: 'in',
  noImagesFound: 'No compatible images found in folder.',
  noImagesInDrop: 'No compatible image files dropped.',
  folderReadError: 'Error reading folder',
  folderFallback: 'Folder',
  clearFiles: 'Clear files',

  // Sections panel
  folderSections: 'Folder sections',
  onePdf: 'One PDF',
  pdfPerFolder: 'PDF per folder',
  image: 'image',
  imagesPl: 'images',

  // PDF options
  pdfTitle: 'PDF title',
  pdfTitlePlaceholder: 'PDF title (optional)',
  showTitleLabel: 'Show title',
  pageNumbers: 'Page numbers',
  subfolders: 'Subfolders',

  // Grid controls
  gridLayout: 'Settings',
  columns: 'Columns',
  rows: 'Rows',
  orientation: 'Orientation',
  portrait: 'Portrait',
  landscape: 'Landscape',
  quality: 'Quality',
  preview: 'Preview',

  // Quality toggle
  qualityDefault: 'Default',
  qualityHighRes: 'High Res',

  // Layout settings
  layoutSettings: 'Layout settings',
  borderMm: 'Margin (mm)',
  headerMm: 'Header (mm)',
  titlePt: 'Title (pt)',
  fontPt: 'Font (pt)',
  defaults: 'Defaults',
  imagesPerPage: 'images per page',
  page: 'page',
  pages: 'pages',

  // Generate & progress
  generateContactSheet: 'Generate contact sheet',
  selectFiles: 'Please select files',
  generating: 'Generating...',
  imageProgress: 'Image {current} / {total}',
  cancel: 'Cancel',
  cancelled: 'Generation cancelled.',

  // Result actions
  pdfCreated: 'PDF created',
  pdfsCreated: '{count} PDFs created',
  pagesTotal: '{pages} pages total',
  contactSheetCreated: 'Contact sheet created',
  open: 'Open',
  showInFolder: 'Show',
  showInFolderLong: 'Show in folder',

  // Footer
  footer: '© 2026 E.-D. Beisswenger · EasyImageGrid v2.0',

  // Error
  error: 'Error',

  // Settings modal
  settings: 'Settings',
  qualityPresets: 'Quality presets',
  presetName: 'Name',
  resolutionQuality: 'Resolution',
  jpegCompression: 'JPEG compression',
  resetPreset: 'Reset preset',
  deletePreset: 'Delete preset',
  addPreset: 'Add preset',
  maxPresetsReached: 'Max 4 presets',
  factoryReset: 'Factory reset',
  factoryResetConfirm: 'Reset all presets to factory defaults?',
  close: 'Close',

  // Accessibility
  langToggle: 'Switch to German',
};

export type Translations = typeof de;
export type LangKey = 'de' | 'en';

const languages: Record<LangKey, Translations> = { de, en };

interface LanguageContextValue {
  t: Translations;
  lang: LangKey;
  setLang: (lang: LangKey) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'lang';

function getInitialLang(): LangKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
  } catch {
    // localStorage may be unavailable
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangKey>(getInitialLang);

  const setLang = useCallback((newLang: LangKey) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    t: languages[lang],
    lang,
    setLang,
  }), [lang, setLang]);

  return React.createElement(LanguageContext.Provider, { value }, children);
}

export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT must be used within a LanguageProvider');
  return ctx;
}
