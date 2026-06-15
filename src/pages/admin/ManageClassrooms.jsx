import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Table, THead, Th, TBody, Td } from '../../components/ui/Table'
import { Loading } from '../../components/ui/Loading'
import { Pencil, Trash2, Plus, Search, LayoutGrid } from 'lucide-react'

function generateSeats(rows, cols) {
  const seats = []
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r)
    for (let c = 1; c <= cols; c++) {
      seats.push({ label: `${rowLabel}${c}`, row: r, col: c })
    }
  }
  return seats
}

function SeatPreview({ rows, cols }) {
  const seats = useMemo(() => generateSeats(rows, cols), [rows, cols])

  return (
    <div className="space-y-1">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-1">
          {seats.slice(r * cols, (r + 1) * cols).map((s) => (
            <div
              key={s.label}
              className="flex h-8 w-8 items-center justify-center rounded border text-[10px] font-medium text-gray-600 bg-gray-50"
              title={s.label}
            >
              {s.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function ManageClassrooms() {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', rows: 4, cols: 5 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let q = supabase.from('classrooms').select('*').order('name')
      if (query) q = q.ilike('name', `%${query}%`)
      const { data } = await q
      if (data) setClassrooms(data)
      setLoading(false)
    }
    load()
  }, [query, refreshKey])

  const handleSearch = () => { setQuery(search) }

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', rows: 4, cols: 5 })
    setModalOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, rows: c.rows, cols: c.cols })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.rows || !form.cols) return
    setSaving(true)
    const payload = {
      name: form.name,
      rows: form.rows,
      cols: form.cols,
      total_seats: form.rows * form.cols,
      building: '',
      floor: 1,
    }
    if (editing) {
      await supabase.from('classrooms').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('classrooms').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    setRefreshKey((k) => k + 1)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this classroom?')) return
    await supabase.from('classrooms').delete().eq('id', id)
    setRefreshKey((k) => k + 1)
  }

  const previewClassroom = editing || form

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classrooms</h1>
          <p className="text-sm text-gray-500">Manage classroom seating layouts</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add Classroom</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <Input
              className="pl-9" placeholder="Search by room number..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>Search</Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <THead>
            <tr><Th>Room</Th><Th>Layout</Th><Th>Total Seats</Th><Th>Preview</Th><Th className="text-right">Actions</Th></tr>
          </THead>
          <TBody>
            {classrooms.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.name}</Td>
                <Td className="text-gray-500">{c.rows} rows &times; {c.cols} cols</Td>
                <Td>{c.total_seats}</Td>
                <Td>
                  <details className="cursor-pointer">
                    <summary className="text-xs text-indigo-600 hover:text-indigo-500">Show layout</summary>
                    <div className="mt-2">
                      <SeatPreview rows={c.rows} cols={c.cols} />
                    </div>
                  </details>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></Button>
                  </div>
                </Td>
              </tr>
            ))}
            {classrooms.length === 0 && (
              <tr><Td colSpan={5} className="py-8 text-center text-gray-400">No classrooms found.</Td></tr>
            )}
          </TBody>
        </Table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Classroom' : 'Add Classroom'} className="max-w-lg">
        <div className="space-y-4">
          <Input label="Room Number" placeholder="e.g. CS-101" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Number of Rows" type="number" min={1} max={26} value={form.rows} onChange={(e) => setForm({ ...form, rows: Math.max(1, +e.target.value || 1) })} />
            <Input label="Number of Columns" type="number" min={1} max={26} value={form.cols} onChange={(e) => setForm({ ...form, cols: Math.max(1, +e.target.value || 1) })} />
          </div>

          {previewClassroom.name && previewClassroom.rows > 0 && previewClassroom.cols > 0 && (
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <LayoutGrid size={16} /> Seat Layout Preview ({previewClassroom.rows} &times; {previewClassroom.cols})
              </div>
              <SeatPreview rows={previewClassroom.rows} cols={previewClassroom.cols} />
              <p className="mt-2 text-xs text-gray-400">Total: {previewClassroom.rows * previewClassroom.cols} seats</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Classroom'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
