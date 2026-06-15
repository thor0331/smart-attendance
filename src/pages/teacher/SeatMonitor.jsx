import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Badge } from '../../components/ui/Badge'
import { Loading } from '../../components/ui/Loading'
import { cn } from '../../lib/utils'
import { Users, UserCheck, UserX, MapPin } from 'lucide-react'

export function SeatMonitor() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [classroom, setClassroom] = useState(null)
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('*, subjects(name,code), classrooms(*)')
        .eq('teacher_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (data) setSessions(data)
      setLoading(false)
    }
    fetchSessions()
  }, [profile])

  useEffect(() => {
    if (!selectedSession) { setClassroom(null); setAllocations([]); return }

    const fetchDetails = async () => {
      const [cRes, aRes] = await Promise.all([
        supabase.from('classrooms').select('*').eq('id', selectedSession.classroom_id).single(),
        supabase.from('seat_allocations').select('*, profiles(full_name, avatar_url)').eq('session_id', selectedSession.id),
      ])
      if (cRes.data) setClassroom(cRes.data)
      if (aRes.data) setAllocations(aRes.data)
    }
    fetchDetails()

    const channel = supabase
      .channel(`seat-monitor-${selectedSession.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_allocations', filter: `session_id=eq.${selectedSession.id}` }, async () => {
        const { data: fresh } = await supabase
          .from('seat_allocations')
          .select('*, profiles(full_name, avatar_url)')
          .eq('session_id', selectedSession.id)
        if (fresh) setAllocations(fresh)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedSession])

  if (loading) return <Loading />

  const seatMap = {}
  allocations.forEach((a) => {
    seatMap[`${a.seat_row}-${a.seat_col}`] = a
  })

  const totalSeats = classroom?.total_seats || 0
  const occupiedSeats = allocations.length
  const emptySeats = totalSeats - occupiedSeats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seat Monitor</h1>
        <p className="text-sm text-gray-500">Live view of seat allocations — updates in realtime</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Select
            label="Select Active Session"
            value={selectedSession?.id || ''}
            onChange={(e) => setSelectedSession(sessions.find((s) => s.id === e.target.value))}
            options={sessions.map((s) => ({
              value: s.id,
              label: `${s.subjects?.name} (${s.subjects?.code}) — ${s.classrooms?.name}`,
            }))}
            placeholder="Choose a session..."
          />
        </CardContent>
      </Card>

      {selectedSession && classroom && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="rounded-lg bg-indigo-100 p-2">
                  <MapPin size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Seats</p>
                  <p className="text-lg font-bold text-gray-900">{totalSeats}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <UserCheck size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Occupied</p>
                  <p className="text-lg font-bold text-emerald-600">{occupiedSeats}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="rounded-lg bg-amber-100 p-2">
                  <UserX size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Empty</p>
                  <p className="text-lg font-bold text-amber-600">{emptySeats}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Users size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Present</p>
                  <p className="text-lg font-bold text-purple-600">{occupiedSeats}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{classroom.name}</h2>
                <Badge variant="secondary">Realtime</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-2">
                <div className="mb-4 w-3/4 rounded-lg bg-gray-100 py-2 text-center text-xs font-medium text-gray-500">
                  BOARD
                </div>

                {Array.from({ length: classroom.rows }, (_, r) => (
                  <div key={r} className="flex gap-2">
                    {Array.from({ length: classroom.cols }, (_, c) => {
                      const key = `${r}-${c}`
                      const seat = seatMap[key]
                      return (
                        <div
                          key={c}
                          className={cn(
                            'flex h-14 w-14 flex-col items-center justify-center rounded-lg text-xs font-medium transition-all',
                            seat
                              ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-300 shadow-sm'
                              : 'bg-gray-50 text-gray-300 border border-dashed border-gray-200'
                          )}
                          title={seat ? `${seat.profiles?.full_name} (${String.fromCharCode(65 + r)}${c + 1})` : `${String.fromCharCode(65 + r)}${c + 1} — Empty`}
                        >
                          {seat ? (
                            <>
                              {seat.profiles?.avatar_url ? (
                                <img
                                  src={seat.profiles.avatar_url}
                                  alt=""
                                  className="mb-0.5 h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-[9px] font-bold text-emerald-800">
                                  {seat.profiles?.full_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="truncate max-w-[52px] text-[9px] leading-tight">
                                {seat.profiles?.full_name?.split(' ').pop() || '?'}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px]">{String.fromCharCode(65 + r)}{c + 1}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-emerald-50 border-2 border-emerald-300" /> Occupied ({occupiedSeats})
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded bg-gray-50 border border-dashed border-gray-200" /> Empty ({emptySeats})
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold">Occupied Seats List</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {allocations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      {a.profiles?.avatar_url ? (
                        <img src={a.profiles.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                          {a.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{a.profiles?.full_name || 'Unknown'}</span>
                    </div>
                    <Badge variant="success">
                      {String.fromCharCode(65 + a.seat_row)}{a.seat_col + 1}
                    </Badge>
                  </div>
                ))}
                {allocations.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-gray-400">No seats allocated yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedSession && !classroom && (
        <Card>
          <CardContent className="py-8 text-center text-gray-400">
            <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
            <p>Classroom details not available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
