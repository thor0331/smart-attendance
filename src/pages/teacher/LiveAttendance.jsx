import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { Badge } from '../../components/ui/Badge'
import { formatDate, formatDuration, computeAttendanceStatus } from '../../lib/utils'
import { Users, Clock, MapPin, UserCheck, UserX } from 'lucide-react'

export function LiveAttendance() {
  const { id } = useParams()
  const [session, setSession] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const fetchSession = async () => {
      const { data: s } = await supabase
        .from('attendance_sessions')
        .select('*, subjects(name,code), classrooms(name), profiles(full_name)')
        .eq('id', id)
        .single()
      if (s) setSession(s)

      const { data: r } = await supabase
        .from('attendance_records')
        .select('*, profiles(id,full_name,avatar_url)')
        .eq('session_id', id)
        .order('marked_at', { ascending: false })
      if (r) setRecords(r || [])

      setLoading(false)
    }
    fetchSession()

    const channel = supabase
      .channel(`live-attendance-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records', filter: `session_id=eq.${id}` }, async (payload) => {
        const { data: newRec } = await supabase
          .from('attendance_records')
          .select('*, profiles(id,full_name,avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (newRec) {
          setRecords((prev) => [newRec, ...prev])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const statusVariant = (status) => {
    if (status === 'present') return 'success'
    if (status === 'teacher_review') return 'warning'
    return 'danger'
  }

  const statusLabel = (status) => {
    if (status === 'present') return 'Present'
    if (status === 'teacher_review') return 'Teacher Review'
    return 'Absent'
  }

  if (loading) return <Loading />

  if (!session) return (
    <Card>
      <CardContent className="py-12 text-center text-gray-500">Session not found.</CardContent>
    </Card>
  )

  const totalStudents = records.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Attendance</h1>
        <p className="text-sm text-gray-500">Real-time attendance tracking</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-indigo-100 p-2.5">
              <Users size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Subject</p>
              <p className="text-sm font-semibold text-gray-900">{session.subjects?.name}</p>
              <p className="text-xs text-gray-400">{session.subjects?.code}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-green-100 p-2.5">
              <UserCheck size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Present</p>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Clock size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Started</p>
              <p className="text-sm font-semibold text-gray-900">
                {session.created_at ? new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-purple-100 p-2.5">
              <MapPin size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Classroom</p>
              <p className="text-sm font-semibold text-gray-900">{session.classrooms?.name || '-'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Attendance Records</h3>
            <Badge variant="secondary">{totalStudents} student{totalStudents !== 1 ? 's' : ''}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Entry Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Exit Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Seat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Face</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((rec, i) => {
                  const status = computeAttendanceStatus(rec)
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {rec.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-gray-900">{rec.profiles?.full_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {rec.marked_at ? new Date(rec.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {rec.exit_verified_at ? new Date(rec.exit_verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDuration(rec.marked_at, rec.exit_verified_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {rec.seat_row !== null && rec.seat_col !== null
                          ? `${String.fromCharCode(65 + rec.seat_row)}${rec.seat_col + 1}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={rec.face_verified ? 'success' : 'secondary'}>{rec.face_verified ? 'Yes' : 'No'}</Badge>
                      </td>
                    </tr>
                  )
                })}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <UserX size={32} className="mx-auto mb-2 text-gray-300" />
                      No attendance recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}