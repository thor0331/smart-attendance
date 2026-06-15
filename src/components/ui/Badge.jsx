import { cn } from '../../lib/utils'

const colors = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-amber-100 text-amber-700',
}

export function Badge({ children, variant, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors[variant] || 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {children}
    </span>
  )
}
