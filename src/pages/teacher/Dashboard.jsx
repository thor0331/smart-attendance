import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { formatDate } from '../../lib/utils'
import { Play, FileSpreadsheet, Calendar, Clock, ArrowRight } from 'lucide-react'

export function TeacherDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState({ todayClasses: [], activeSessions: [], stats: { active: 0, total: 0, todayCount: 0 } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().getDay()
      const teacherId = profile.id

      const [timetable, sessions, activeResult, totalResult] = await Promise.all([
        supabase
          .from('timetable')
          .select('id, start_time, end_time, subjects(name), classrooms(name)')
          .eq('teacher_id', teacherId)
          .eq('day_of_week', today)
          .order('start_time'),
        supabase
          .from('attendance_sessions')
          .select('*, subjects(name), classrooms(name)')
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('attendance_sessions')
          .select('id', { count: 'exact' })
          .eq('teacher_id', teacherId)
          .eq('status', 'active'),
        supabase
          .from('attendance_sessions')
          .select('id', { count: 'exact' })
          .eq('teacher_id', teacherId),
      ])

      setData({
        todayClasses: timetable.data ?? [],
        activeSessions: sessions.data ?? [],
        stats: {
          active: activeResult.count ?? 0,
          total: totalResult.count ?? 0,
          todayCount: timetable.data?.length ?? 0,
        },
      })
      setLoading(false)
    }
    fetchData()
  }, [profile])

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {profile?.full_name}</h1>
        <p className="mt-1 text-sm text-gray-500">Teacher Dashboard</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <Play className="text-white" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.active}</p>
              <p className="text-sm text-gray-500">Active Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.todayCount}</p>
              <p className="text-sm text-gray-500">Today&apos;s Classes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500">
              <FileSpreadsheet className="text-white" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.total}</p>
              <p className="text-sm text-gray-500">Total Sessions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
              <Play size={32} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Start Attendance</h3>
              <p className="mt-1 text-sm text-gray-500">Create a new attendance session with QR code</p>
            </div>
            <Button size="lg" onClick={() => navigate('/teacher/sessions')}>
              Start New Session
              <ArrowRight size={18} />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <FileSpreadsheet size={32} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Attendance Reports</h3>
              <p className="mt-1 text-sm text-gray-500">Export and review attendance records</p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/teacher/export')}
            >
              View Reports
              <ArrowRight size={18} />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar size={16} />
              Today&apos;s Classes
            </h2>
          </CardHeader>
          <CardContent>
            {data.todayClasses.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No classes scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {data.todayClasses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.subjects?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{c.classrooms?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {c.start_time?.slice(0, 5)} - {c.end_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Recent Sessions</h2>
          </CardHeader>
          <CardContent>
            {data.activeSessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">No sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {data.activeSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{s.subjects?.name}</p>
                      <p className="text-xs text-gray-500">{s.classrooms?.name} &mdash; {formatDate(s.created_at)}</p>
                    </div>
                    <Badge variant={s.status}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
