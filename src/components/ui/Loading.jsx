export function Loading({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-sm text-gray-500">Loading Smart Attendance...</p>
      </div>
    </div>
  )
}
