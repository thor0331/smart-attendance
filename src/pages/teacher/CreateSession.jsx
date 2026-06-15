import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Card, CardContent } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { Play, Info } from 'lucide-react'

export function CreateSession() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [teacherSubjects, setTeacherSubjects] = useState([])
  const [timetableSlots, setTimetableSlots] = useState([])
  const [filteredSlots, setFilteredSlots] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    if (!profile) return

    const [subRes, ttRes] = await Promise.all([
      supabase.from('subjects').select('id,name,code').eq('teacher_id', profile.id),
      supabase
        .from('timetable')
        .select('id,day_of_week,start_time,end_time,classroom_id,subjects!inner(id,name,code),classrooms(name)')
        .eq('teacher_id', profile.id)
        .order('day_of_week')
        .order('start_time'),
    ])

    if (subRes.data) setTeacherSubjects(subRes.data)
    if (ttRes.data) setTimetableSlots(ttRes.data)
    setLoading(false)
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!selectedSubject) {
      setFilteredSlots([])
      return
    }
    setFilteredSlots(timetableSlots.filter((s) => s.subjects.id === selectedSubject))
  }, [selectedSubject, timetableSlots])

  const handleCreate = async () => {
    if (!selectedSubject || !selectedSlot) {
      setError('Select a subject and a timetable slot')
      return
    }
    setCreating(true)
    setError('')

    const slot = timetableSlots.find((s) => s.id === selectedSlot)
    if (!slot) return

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString()

    const { data: session, error: insertErr } = await supabase
      .from('attendance_sessions')
      .insert({
        timetable_id: selectedSlot,
        teacher_id: profile.id,
        subject_id: selectedSubject,
        classroom_id: slot.classroom_id,
        session_code: code,
        status: 'active',
        qr_token: crypto.randomUUID(),
        qr_expires_at: expiresAt,
      })
      .select()
      .single()

    if (insertErr) {
      setError(insertErr.message)
      setCreating(false)
      return
    }

    setCreating(false)
    navigate(`/teacher/session-qr/${session.id}`, { state: { session } })
  }

  if (loading) return <Loading />

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Session</h1>
        <p className="text-sm text-gray-500">Start a new attendance session for a class</p>
      </div>

      {teacherSubjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Info size={40} className="mb-3 text-gray-300" />
            <p className="text-gray-500">You are not assigned to any subjects yet.</p>
            <p className="text-xs text-gray-400 mt-1">Contact an admin to assign subjects to you.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <Select
              label="Subject"
              value={selectedSubject}
              onChange={(e) => { setSelectedSubject(e.target.value); setSelectedSlot('') }}
              options={teacherSubjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
              placeholder="Choose a subject you teach"
            />

            {selectedSubject && (
              <Select
                label="Timetable Slot"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                options={filteredSlots.map((s) => {
                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                  return {
                    value: s.id,
                    label: `${days[s.day_of_week]} | ${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)} | ${s.classrooms?.name}`,
                  }
                })}
                placeholder="Select a scheduled time & classroom"
              />
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleCreate}
                disabled={!selectedSubject || !selectedSlot || creating}
              >
                <Play size={16} />
                {creating ? 'Creating...' : 'Start Session'}
              </Button>
            </div>

            {selectedSlot && (() => {
              const slot = timetableSlots.find((s) => s.id === selectedSlot)
              if (!slot) return null
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
              return (
                <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                  <h4 className="text-sm font-medium text-indigo-800 mb-1">Session Details</h4>
                  <div className="text-sm text-indigo-700 space-y-0.5">
                    <p>Day: {days[slot.day_of_week]}</p>
                    <p>Time: {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</p>
                    <p>Classroom: {slot.classrooms?.name}</p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
