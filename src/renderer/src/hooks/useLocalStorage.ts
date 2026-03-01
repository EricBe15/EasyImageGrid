import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: {
    validate?: (v: unknown) => v is T;
    migrate?: (v: T) => T;
  },
): [T, (v: T) => void] {
  const [value, setValueRaw] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (options?.validate && !options.validate(parsed)) {
          return defaultValue;
        }
        const result = options?.migrate ? options.migrate(parsed as T) : (parsed as T);
        return result;
      }
    } catch { /* ignore */ }
    return defaultValue;
  });

  const setValue = useCallback((v: T) => {
    setValueRaw(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch { /* ignore */ }
  }, [key]);

  return [value, setValue];
}
