import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card, CardContent } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Table, THead, Th, TBody, Td } from '../../components/ui/Table'
import { Loading } from '../../components/ui/Loading'
import { Pencil, Trash2, Plus, CalendarDays, List } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const h = i + 8
  return `${String(h).padStart(2, '0')}:00`
})

const dayOpts = DAYS.slice(1).concat(DAYS[0]).map((d, i) => ({
  value: i === 6 ? 0 : i + 1,
  label: d,
}))

export function ManageTimetable() {
  const [entries, setEntries] = useState([])
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('table')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ subject_id: '', teacher_id: '', classroom_id: '', day_of_week: 1, start_time: '08:00', end_time: '09:00' })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    const [eRes, tRes, sRes, cRes] = await Promise.all([
      supabase.from('timetable').select('*, subjects(name,code), profiles(full_name), classrooms(name)').order('day_of_week').order('start_time'),
      supabase.from('profiles').select('id,full_name').eq('role', 'teacher').order('full_name'),
      supabase.from('subjects').select('id,name,code').order('name'),
      supabase.from('classrooms').select('id,name').order('name'),
    ])
    if (eRes.data) setEntries(eRes.data)
    if (tRes.data) setTeachers(tRes.data)
    if (sRes.data) setSubjects(sRes.data)
    if (cRes.data) setClassrooms(cRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchData(); /* eslint-disable-line react-hooks/set-state-in-effect */ }, [])

  const openEdit = (e) => {
    setEditing(e)
    setForm({
      subject_id: e.subject_id,
      teacher_id: e.teacher_id,
      classroom_id: e.classroom_id,
      day_of_week: e.day_of_week,
      start_time: e.start_time.slice(0, 5),
      end_time: e.end_time.slice(0, 5),
    })
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ subject_id: '', teacher_id: '', classroom_id: '', day_of_week: 1, start_time: '08:00', end_time: '09:00' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = { ...form, start_time: `${form.start_time}:00`, end_time: `${form.end_time}:00` }
    if (editing) {
      await supabase.from('timetable').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('timetable').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    fetchData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this timetable entry?')) return
    await supabase.from('timetable').delete().eq('id', id)
    fetchData()
  }

  const getEntriesForSlot = (day, time) => {
    return entries.filter((e) => {
      if (e.day_of_week !== day) return false
      const start = e.start_time.slice(0, 5)
      const end = e.end_time.slice(0, 5)
      return time >= start && time < end
    })
  }

  if (loading) return <Loading />

  const weeklyDays = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-sm text-gray-500">Schedule classes across the week</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${view === 'table' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={14} /> Table
            </button>
            <button
              onClick={() => setView('weekly')}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${view === 'weekly' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarDays size={14} /> Weekly
            </button>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> Add Entry</Button>
        </div>
      </div>

      {view === 'table' ? (
        <Card>
          <Table>
            <THead>
              <tr><Th>Day</Th><Th>Time</Th><Th>Subject</Th><Th>Teacher</Th><Th>Classroom</Th><Th className="text-right">Actions</Th></tr>
            </THead>
            <TBody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium">{DAYS[e.day_of_week]}</Td>
                  <Td className="text-gray-500">{e.start_time.slice(0, 5)} - {e.end_time.slice(0, 5)}</Td>
                  <Td>{e.subjects?.name} <span className="text-xs text-gray-400">({e.subjects?.code})</span></Td>
                  <Td>{e.profiles?.full_name}</Td>
                  <Td>{e.classrooms?.name}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></Button>
                    </div>
                  </Td>
                </tr>
              ))}
              {entries.length === 0 && <tr><Td colSpan={6} className="py-8 text-center text-gray-400">No timetable entries</Td></tr>}
            </TBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
              <div className="border-b border-r bg-gray-50 p-2 text-xs font-medium text-gray-500 sticky left-0">Time</div>
              {weeklyDays.map((d) => (
                <div key={d} className="border-b border-r bg-gray-50 p-2 text-center text-xs font-medium text-gray-700">
                  {DAYS[d]}
                </div>
              ))}

              {TIME_SLOTS.map((time, ti) => (
                <div key={time} className="contents">
                  <div className={`border-b border-r p-2 text-xs text-gray-400 sticky left-0 bg-white ${ti % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    {time}
                  </div>
                  {weeklyDays.map((day) => {
                    const cellEntries = getEntriesForSlot(day, time)
                    return (
                      <div
                        key={`${day}-${time}`}
                        className={`border-b border-r p-1 min-h-[60px] ${ti % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                      >
                        {cellEntries.map((e) => (
                          <div
                            key={e.id}
                            className="mb-1 rounded-md bg-indigo-50 border border-indigo-200 px-1.5 py-1 text-xs leading-tight cursor-pointer hover:bg-indigo-100"
                            onClick={() => openEdit(e)}
                            title={`${e.subjects?.name}\n${e.profiles?.full_name}\n${e.classrooms?.name}`}
                          >
                            <div className="font-medium text-indigo-700 truncate">{e.subjects?.name}</div>
                            <div className="text-indigo-500 truncate">{e.profiles?.full_name}</div>
                            <div className="text-indigo-400">{e.classrooms?.name}</div>
                            <div className="text-indigo-400">{e.start_time.slice(0, 5)}-{e.end_time.slice(0, 5)}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Entry' : 'Add Entry'} className="max-w-lg">
        <div className="space-y-4">
          <Select label="Subject" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} options={subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))} placeholder="Select subject" />
          <Select label="Teacher" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} options={teachers.map((t) => ({ value: t.id, label: t.full_name }))} placeholder="Select teacher" />
          <Select label="Classroom" value={form.classroom_id} onChange={(e) => setForm({ ...form, classroom_id: e.target.value })} options={classrooms.map((c) => ({ value: c.id, label: c.name }))} placeholder="Select classroom" />
          <Select label="Day" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: +e.target.value })} options={dayOpts} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Input label="End Time" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
