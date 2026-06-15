import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatDateOnly(date) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(date))
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatDuration(entryTime, exitTime) {
  if (!entryTime || !exitTime) return '—'
  const diff = new Date(exitTime) - new Date(entryTime)
  if (diff < 0) return '—'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function computeAttendanceStatus(record) {
  if (record.face_verified && record.exit_verified) return 'present'
  if (record.face_verified && !record.exit_verified) return 'teacher_review'
  return 'absent'
}
