import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import type { ToastMessage } from '../toast'
import { setToastListener } from '../toast'

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const iconColors = {
  success: 'text-brand',
  error: 'text-red-400',
  info: 'text-blue-400',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    setToastListener((toast) => {
      setToasts((prev) => [...prev, toast])
      const timeout = toast.duration ?? (toast.type === 'error' ? 8000 : 4000)
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, timeout)
    })
    return () => {
      setToastListener(null)
    }
  }, [])

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                WebkitBackdropFilter: 'blur(20px)',
                backdropFilter: 'blur(20px)',
              }}
              role="alert"
              aria-live="assertive"
              className="pointer-events-auto px-4 py-3 rounded-xl text-sm font-medium max-w-sm flex items-center gap-2.5 text-gray-800 dark:text-gray-100"
            >
              <Icon size={16} className={iconColors[toast.type]} />
              {toast.message}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
