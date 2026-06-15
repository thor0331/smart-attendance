import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { Users, BookOpen, MapPin, UserCog, Upload, GraduationCap } from 'lucide-react'

export function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchStats = async () => {
      const [teachers, students, subjects, classrooms] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('subjects').select('id', { count: 'exact' }),
        supabase.from('classrooms').select('id', { count: 'exact' }),
      ])
      setStats({
        teachers: teachers.count ?? 0,
        students: students.count ?? 0,
        subjects: subjects.count ?? 0,
        classrooms: classrooms.count ?? 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) return <Loading />

  const statCards = [
    { label: 'Total Students', value: stats.students, icon: Users, color: 'bg-amber-500', href: '/admin/students' },
    { label: 'Total Teachers', value: stats.teachers, icon: GraduationCap, color: 'bg-blue-500', href: '/admin/teachers' },
    { label: 'Total Subjects', value: stats.subjects, icon: BookOpen, color: 'bg-emerald-500', href: '/admin/subjects' },
    { label: 'Total Classrooms', value: stats.classrooms, icon: MapPin, color: 'bg-purple-500', href: '/admin/classrooms' },
  ]

  const quickLinks = [
    { to: '/admin/students', label: 'Students', desc: 'Manage student profiles', icon: Users },
    { to: '/admin/teachers', label: 'Teachers', desc: 'Manage teacher profiles', icon: GraduationCap },
    { to: '/admin/subjects', label: 'Subjects', desc: 'Create and assign subjects', icon: BookOpen },
    { to: '/admin/classrooms', label: 'Classrooms', desc: 'Configure seating layouts', icon: MapPin },
    { to: '/admin/timetable', label: 'Timetable', desc: 'Schedule classes', icon: UserCog },
    { to: '/admin/users', label: 'Users', desc: 'Manage all system users', icon: UserCog },
    { to: '/admin/excel-import', label: 'Excel Import', desc: 'Bulk import users from spreadsheet', icon: Upload },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your attendance system</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(card.href)}
            className="text-left cursor-pointer"
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.color}`}>
                  <card.icon className="text-white" size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500 truncate">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Quick Links</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((link) => (
              <QuickLink key={link.to} to={link.to} label={link.label} desc={link.desc} icon={link.icon} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuickLink({ to, label, desc, icon: Icon }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer w-full"
    >
      <Icon size={24} className="shrink-0 text-indigo-600" />
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 truncate">{desc}</p>
      </div>
    </button>
  )
}
