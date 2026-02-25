Object.defineProperty(window, 'electronAPI', {
  value: {
    openFolder: async () => null,
    readFiles: async () => [],
    confirmOverwrite: async () => null,
    generate: async () => ({}),
    onProgress: () => {},
    cancelGenerate: async () => {},
    openFile: async () => {},
    showInFolder: () => {}
  },
  writable: true
})

// Stub localStorage for i18n
const store: Record<string, string> = {}
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k in store) delete store[k]
    }
  }
})
