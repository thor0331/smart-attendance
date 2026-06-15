import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCog,
  GraduationCap,
  BookOpen,
  MapPin,
  Calendar,
  QrCode,
  Monitor,
  FileSpreadsheet,
  Camera,
  LogOut,
  ScanQrCode,
  ClipboardCheck,
  Upload,
  X,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
  { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/admin/classrooms', label: 'Classrooms', icon: MapPin },
  { to: '/admin/timetable', label: 'Timetable', icon: Calendar },
  { to: '/admin/users', label: 'Users', icon: UserCog },
  { to: '/admin/excel-import', label: 'Excel Import', icon: Upload },
]

const teacherLinks = [
  { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teacher/sessions', label: 'New Session', icon: QrCode },
  { to: '/teacher/monitor', label: 'Presence Monitor', icon: Monitor },
  { to: '/teacher/export', label: 'Export', icon: FileSpreadsheet },
]

const studentLinks = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/scan', label: 'Scan QR', icon: ScanQrCode },
  { to: '/student/face', label: 'Face Verify', icon: Camera },
  { to: '/student/seat', label: 'Select Seat', icon: ClipboardCheck },
  { to: '/student/reports', label: 'Reports', icon: FileSpreadsheet },
]

export function Sidebar({ open, onClose }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const links =
    profile?.role === 'admin'
      ? adminLinks
      : profile?.role === 'teacher'
        ? teacherLinks
        : studentLinks

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              SA
            </div>
            <span className="text-lg font-bold text-gray-900">Attendance</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 lg:hidden cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === `/${profile?.role}`}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {profile?.full_name}
              </p>
              <p className="truncate text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-500"
            onClick={handleSignOut}
          >
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
