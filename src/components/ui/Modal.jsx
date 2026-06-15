import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Modal({ open, onClose, title, children, className }) {
  const overlayRef = useRef()

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.() }}
    >
      <div className={cn('w-full max-w-lg rounded-xl bg-white shadow-xl', className)}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
