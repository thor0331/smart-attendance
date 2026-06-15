import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { cn } from '../../lib/utils'
import { Check, MapPin, AlertCircle } from 'lucide-react'

export function SeatSelection() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [classroom, setClassroom] = useState(null)
  const [allocations, setAllocations] = useState([])
  const [myAllocation, setMyAllocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    const { data: record } = await supabase
      .from('attendance_records')
      .select('session_id, attendance_sessions!inner(id, classroom_id, subjects(name,code), classrooms(*), status)')
      .eq('student_id', profile.id)
      .eq('face_verified', true)
      .order('marked_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!record) {
      setLoading(false)
      return
    }

    const sess = record.attendance_sessions
    setSession(sess)

    const [cData, aData, myData] = await Promise.all([
      supabase.from('classrooms').select('*').eq('id', sess.classroom_id).single(),
      supabase.from('seat_allocations').select('*, profiles(full_name)').eq('session_id', sess.id),
      supabase.from('seat_allocations').select('*').eq('session_id', sess.id).eq('student_id', profile.id).maybeSingle(),
    ])

    if (cData.data) setClassroom(cData.data)
    if (aData.data) setAllocations(aData.data)
    if (myData.data) setMyAllocation(myData.data)
    setLoading(false)
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  const allocatedSeats = new Set(allocations.map((a) => `${a.seat_row}-${a.seat_col}`))
  const mySeatKey = myAllocation ? `${myAllocation.seat_row}-${myAllocation.seat_col}` : null

  const handleSeatClick = async (row, col) => {
    if (!session || !classroom) return
    const key = `${row}-${col}`
    if (allocatedSeats.has(key) && key !== mySeatKey) return
    setError('')

    setSaving(true)
    try {
      if (myAllocation) {
        await supabase.from('seat_allocations').delete().eq('id', myAllocation.id)
      }

      const { error: insertErr } = await supabase.from('seat_allocations').insert({
        session_id: session.id,
        student_id: profile.id,
        seat_row: row,
        seat_col: col,
      })

      if (insertErr) {
        if (insertErr.code === '23505') {
          setError('This seat was just taken by another student. Please choose another.')
        } else {
          setError(insertErr.message)
        }
        setSaving(false)
        return
      }

      await supabase
        .from('attendance_records')
        .update({ seat_row: row, seat_col: col })
        .eq('session_id', session.id)
        .eq('student_id', profile.id)

      setMyAllocation({ seat_row: row, seat_col: col })
      setCompleted(true)
    } catch {
      setError('Failed to allocate seat. Please try again.')
    }
    setSaving(false)
  }

  if (loading) return <Loading />

  if (!session) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Check size={48} className="text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900">Face Verification Required</h2>
            <p className="text-sm text-gray-500">Please verify your face before selecting a seat.</p>
            <Button onClick={() => navigate('/student/face')}>Verify Face</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="rounded-full bg-emerald-100 p-4">
              <Check size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Attendance Complete!</h2>
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 text-center">
              <p className="text-sm font-medium text-indigo-800">{session.subjects?.name}</p>
              <p className="text-xs text-indigo-600">{session.classrooms?.name}</p>
              {myAllocation && (
                <p className="mt-2 text-lg font-bold text-indigo-700">
                  Seat {String.fromCharCode(65 + (myAllocation.seat_row || 0))}{(myAllocation.seat_col || 0) + 1}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/student/reports')}>
                View Reports
              </Button>
              <Button onClick={() => navigate('/student')}>
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Select Your Seat</h1>
        <p className="text-sm text-gray-500">
          {session.subjects?.name} — {session.classrooms?.name}
        </p>
      </div>

      {classroom && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <MapPin size={16} />
                {classroom.name}
              </h2>
              <span className="text-xs text-gray-400">
                {classroom.rows} rows &times; {classroom.cols} cols
              </span>
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
                    const occupied = allocatedSeats.has(key)
                    const isMine = key === mySeatKey
                    return (
                      <button
                        key={c}
                        disabled={(occupied && !isMine) || saving}
                        onClick={() => handleSeatClick(r, c)}
                        className={cn(
                          'flex h-12 w-12 flex-col items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer',
                          isMine
                            ? 'bg-emerald-500 text-white border-2 border-emerald-600 scale-110 shadow-md'
                            : occupied
                              ? 'bg-indigo-100 text-indigo-400 border border-indigo-200 cursor-not-allowed'
                              : 'bg-white text-gray-600 border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-sm'
                        )}
                        title={
                          isMine ? 'Your seat'
                            : occupied ? `Occupied by ${allocations.find(a => key === `${a.seat_row}-${a.seat_col}`)?.profiles?.full_name || 'Someone'}`
                              : `${String.fromCharCode(65 + r)}${c + 1} — Available`
                        }
                      >
                        {isMine ? (
                          <><Check size={10} className="mb-0.5" /><span>You</span></>
                        ) : occupied ? (
                          <span className="text-base font-bold">&bull;</span>
                        ) : (
                          <><span className="text-[10px] leading-tight">{String.fromCharCode(65 + r)}</span><span className="text-[10px] leading-tight">{c + 1}</span></>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-emerald-500" /> Your Seat
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-indigo-100 border border-indigo-200" /> Taken
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-white border-2 border-dashed border-gray-300" /> Free
              </span>
            </div>

            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{allocations.length}</span> of <span className="font-medium">{classroom.total_seats}</span> seats filled
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <Loading />
              <p className="text-sm font-medium text-gray-700">Reserving seat...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
