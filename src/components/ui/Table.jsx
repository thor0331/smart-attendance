import { cn } from '../../lib/utils'

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)}>
        {children}
      </table>
    </div>
  )
}

export function THead({ children, className }) {
  return (
    <thead className={cn('border-b border-gray-200 bg-gray-50', className)}>
      {children}
    </thead>
  )
}

export function Th({ children, className }) {
  return (
    <th className={cn('px-4 py-3 font-medium text-gray-600', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }) {
  return (
    <td className={cn('border-b border-gray-100 px-4 py-3', className)}>
      {children}
    </td>
  )
}

export function TBody({ children, className }) {
  return <tbody className={cn('', className)}>{children}</tbody>
}
