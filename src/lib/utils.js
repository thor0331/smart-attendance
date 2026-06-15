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

export function computePresenceScore(record) {
  const entryScore = record.face_verified ? 40 : 0
  const seatScore = record.presence_score != null ? Math.round(record.presence_score * 0.4) : 0
  const exitScore = record.exit_verified ? 20 : 0
  return entryScore + seatScore + exitScore
}

export function getFinalAttendanceStatus(record) {
  const score = computePresenceScore(record)
  if (score >= 80) return 'present'
  if (score >= 40) return 'teacher_review'
  return 'absent'
}

export function seatLabel(row, col) {
  return `${String.fromCharCode(65 + (row || 0))}${(col || 0) + 1}`
}

export function formatMissingDuration(seconds) {
  if (!seconds || seconds <= 0) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs}h ${remMins}m`
  }
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}
