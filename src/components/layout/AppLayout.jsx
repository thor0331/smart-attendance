import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 hover:bg-gray-100 lg:hidden cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div className="text-sm text-gray-500">
            Smart Attendance System
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
