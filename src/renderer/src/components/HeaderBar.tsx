import { Sun, Moon } from 'lucide-react';
import { useT } from '../i18n';

interface HeaderBarProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export function HeaderBar({ theme, onThemeToggle }: HeaderBarProps) {
  const { t, lang, setLang } = useT();

  return (
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
          onClick={onThemeToggle}
          aria-label={t.darkModeToggle}
          className="p-1.5 bg-white/15 hover:bg-white/25 rounded-full border border-white/20 backdrop-blur-md transition-all"
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
      </header>
    </div>
  );
}
