import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useOpenCv } from '../../hooks/useOpenCv'
import { usePresenceMonitor } from '../../hooks/usePresenceMonitor'
import { AlertPanel } from '../../components/teacher/AlertPanel'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { cn, seatLabel } from '../../lib/utils'
import {
  Camera, CameraOff, Monitor,
  Users, Clock, AlertTriangle, CheckCircle,
  UserCheck, UserX, Activity, RefreshCw,
} from 'lucide-react'

const CHECK_INTERVAL = 30000

export function SeatMonitor() {
  const { profile } = useAuth()
  const { cv, loaded: cvLoaded, error: cvError } = useOpenCv()
  const videoRef = useRef(null)

  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [classroom, setClassroom] = useState(null)
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGrid, setShowGrid] = useState(true)

  const {
    monitoring, startMonitoring, stopMonitoring,
    alerts, seatStatuses, presenceScore, frame, cameraReady, monitoringError,
  } = usePresenceMonitor({
    sessionId: selectedSession?.id,
    cv,
    videoRef,
    allocatedSeats: allocations,
    classroom,
  })

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('*, subjects(name,code), classrooms(name)')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setSessions(data)
      setLoading(false)
    }
    fetchSessions()
  }, [profile])

  useEffect(() => {
    if (!selectedSession) {
      setClassroom(null)
      setAllocations([])
      return
    }

    const fetchData = async () => {
      if (selectedSession.classroom_id) {
        const { data: c } = await supabase
          .from('classrooms')
          .select('*')
          .eq('id', selectedSession.classroom_id)
          .single()
        if (c) setClassroom(c)
      }

      const { data: a } = await supabase
        .from('seat_allocations')
        .select('*, profiles(full_name, avatar_url)')
        .eq('session_id', selectedSession.id)
      if (a) setAllocations(a)
    }
    fetchData()

    const channel = supabase
      .channel(`seat-monitor-${selectedSession.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'seat_allocations',
        filter: `session_id=eq.${selectedSession.id}`,
      }, () => {
        supabase
          .from('seat_allocations')
          .select('*, profiles(full_name, avatar_url)')
          .eq('session_id', selectedSession.id)
          .then(({ data }) => { if (data) setAllocations(data) })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedSession])

  const allocatedMap = {}
  allocations.forEach((a) => {
    allocatedMap[`${a.seat_row}-${a.seat_col}`] = a
  })

  const occupiedCount = Object.values(seatStatuses).filter((s) => s.is_present).length
  const totalAllocated = allocations.length
  const emptyCount = totalAllocated - occupiedCount

  const scoreColor = presenceScore >= 80 ? 'text-emerald-600' : presenceScore >= 50 ? 'text-amber-600' : 'text-red-600'

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classroom Presence Monitor</h1>
          <p className="text-sm text-gray-500">
            {monitoring ? 'Monitoring active — checking seat occupancy every 30s' : 'Start monitoring to track seat occupancy'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {monitoring && (
            <Badge variant="success" className="animate-pulse">
              <Activity size={12} className="mr-1" /> LIVE
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[250px]">
          <Select
            label="Select Session"
            value={selectedSession?.id || ''}
            onChange={(e) => setSelectedSession(sessions.find((s) => s.id === e.target.value))}
            options={sessions.map((s) => ({
              value: s.id,
              label: `${s.subjects?.name} (${s.subjects?.code}) — ${s.classrooms?.name || 'N/A'} [${s.status}]`,
            }))}
            placeholder="Choose a session to monitor..."
          />
        </div>
        {!monitoring ? (
          <Button
            onClick={startMonitoring}
            disabled={!selectedSession || !cvLoaded}
          >
            <Camera size={16} /> Start Monitoring
          </Button>
        ) : (
          <Button
            variant="danger"
            onClick={stopMonitoring}
          >
            <CameraOff size={16} /> Stop Monitoring
          </Button>
        )}
      </div>

      {!cvLoaded && !cvError && selectedSession && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 text-sm text-amber-700 flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Loading OpenCV.js... This may take a moment.
          </CardContent>
        </Card>
      )}

      {cvError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-600">
            Failed to load OpenCV.js: {cvError}. Occupancy detection will not work, but seat grid is still visible.
          </CardContent>
        </Card>
      )}

      {monitoringError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-600">
            {monitoringError}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {selectedSession && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Camera size={16} className="text-indigo-600" />
                    {monitoring ? 'Live Classroom Feed' : 'Camera Preview'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {monitoring && (
                      <Badge variant="success">
                        <Activity size={12} className="mr-1" /> {CHECK_INTERVAL / 1000}s cycle
                      </Badge>
                    )}
                    {!monitoring && cameraReady && (
                      <Badge variant="secondary">Camera Ready</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg bg-gray-900"
                    style={{ minHeight: '320px', maxHeight: '480px', objectFit: 'contain' }}
                  />
                  {!cameraReady && !monitoring && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-100/80">
                      <div className="text-center text-gray-400">
                        <Camera size={48} className="mx-auto mb-2" />
                        <p className="text-sm font-medium">Camera inactive</p>
                        <p className="text-xs mt-1">Start monitoring to enable the camera</p>
                      </div>
                    </div>
                  )}
                  {frame && monitoring && (
                    <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-xs text-white">
                      Last capture: {new Date().toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedSession && classroom && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Monitor size={16} className="text-indigo-600" />
                    Seat Occupancy — {selectedSession.classrooms?.name || classroom.name}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGrid(!showGrid)}
                  >
                    {showGrid ? 'Hide Grid' : 'Show Grid'}
                  </Button>
                </div>
              </CardHeader>
              {showGrid && (
                <CardContent>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="mb-4 w-3/4 rounded-lg bg-gray-100 py-2 text-center text-xs font-medium text-gray-500">
                      CAMERA VIEW — {classroom.rows} rows &times; {classroom.cols} cols
                    </div>
                    {Array.from({ length: classroom.rows }, (_, r) => (
                      <div key={r} className="flex gap-2">
                        {Array.from({ length: classroom.cols }, (_, c) => {
                          const key = `${r}-${c}`
                          const allocation = allocatedMap[key]
                          const status = seatStatuses[key]
                          const isOccupied = status?.is_present ?? false
                          const isAllocated = !!allocation
                          const isAbsent = isAllocated && !isOccupied && status?.absentSince
                          const absentDuration = isAbsent
                            ? Math.floor((Date.now() - status.absentSince) / 1000)
                            : 0

                          if (!isAllocated) {
                            return (
                              <div
                                key={c}
                                className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-gray-50 border border-dashed border-gray-200"
                              >
                                <span className="text-[9px] text-gray-300">
                                  {seatLabel(r, c)}
                                </span>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={c}
                              className={cn(
                                'flex h-14 w-14 flex-col items-center justify-center rounded-lg text-xs font-medium transition-all border-2 relative',
                                isOccupied
                                  ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                                  : absentDuration > 0
                                    ? 'bg-red-100 border-red-400 text-red-700 animate-pulse'
                                    : 'bg-amber-100 border-amber-300 text-amber-700'
                              )}
                              title={
                                isOccupied
                                  ? `${allocation.profiles?.full_name} — Present`
                                  : absentDuration > 0
                                    ? `${allocation.profiles?.full_name} — Missing ${absentDuration}s`
                                    : `${allocation.profiles?.full_name} — Not detected`
                              }
                            >
                              <span className="text-[9px] font-bold truncate max-w-[50px] text-center leading-tight">
                                {allocation.profiles?.full_name?.split(' ').pop() || '?'}
                              </span>
                              <span className="text-[8px] opacity-60">{seatLabel(r, c)}</span>
                              {isOccupied && <CheckCircle size={8} className="absolute top-0.5 right-0.5 text-emerald-500" />}
                              {isAbsent && absentDuration > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white font-bold">
                                  !
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-emerald-100 border border-emerald-400" /> Present
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-amber-100 border border-amber-300" /> Not Detected
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-red-100 border border-red-400" /> Absent
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded bg-gray-50 border border-dashed border-gray-200" /> Unallocated
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <Users size={20} className="text-indigo-500 mb-1" />
                <p className="text-2xl font-bold text-gray-900">{totalAllocated}</p>
                <p className="text-xs text-gray-500">Allocated</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <UserCheck size={20} className="text-emerald-500 mb-1" />
                <p className="text-2xl font-bold text-emerald-600">{occupiedCount}</p>
                <p className="text-xs text-gray-500">Present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <UserX size={20} className="text-red-500 mb-1" />
                <p className="text-2xl font-bold text-red-600">{emptyCount}</p>
                <p className="text-xs text-gray-500">Empty</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center py-4">
                <Activity size={20} className="text-indigo-500 mb-1" />
                <p className={`text-2xl font-bold ${scoreColor}`}>{presenceScore}%</p>
                <p className="text-xs text-gray-500">Score</p>
              </CardContent>
            </Card>
          </div>

          {monitoring && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <Monitor size={16} />
                  <span>Monitoring every 30s</span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  Seat occupancy checked via OpenCV.js background subtraction
                </p>
              </CardContent>
            </Card>
          )}

          <AlertPanel
            alerts={alerts}
            sessionId={selectedSession?.id}
          />

          {allocations.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <Users size={16} /> Allocated Students
                </h3>
              </CardHeader>
              <CardContent className="max-h-64 overflow-y-auto space-y-2">
                {allocations.map((a) => {
                  const key = `${a.seat_row}-${a.seat_col}`
                  const status = seatStatuses[key]
                  const isPresent = status?.is_present ?? false
                  const absentSecs = !isPresent && status?.absentSince
                    ? Math.floor((Date.now() - status.absentSince) / 1000)
                    : 0
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                          {a.profiles?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{a.profiles?.full_name}</p>
                          <p className="text-xs text-gray-400">Seat {seatLabel(a.seat_row, a.seat_col)}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {monitoring ? (
                          isPresent ? (
                            <Badge variant="success">Present</Badge>
                          ) : absentSecs > 0 ? (
                            <Badge variant="danger">{absentSecs}s</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )
                        ) : (
                          <Badge variant="secondary">—</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}