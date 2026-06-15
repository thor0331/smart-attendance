import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card, CardContent } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Table, THead, Th, TBody, Td } from '../../components/ui/Table'
import { Loading } from '../../components/ui/Loading'
import { Pencil, Trash2, Plus, Search } from 'lucide-react'

export function ManageSubjects() {
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '', teacher_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [sRes, tRes] = await Promise.all([
        query
          ? supabase.from('subjects').select('*, profiles!subjects_teacher_id_fkey(full_name)').ilike('name', `%${query}%`).order('name')
          : supabase.from('subjects').select('*, profiles!subjects_teacher_id_fkey(full_name)').order('name'),
        supabase.from('profiles').select('id,full_name').eq('role', 'teacher').order('full_name'),
      ])
      if (sRes.data) setSubjects(sRes.data)
      if (tRes.data) setTeachers(tRes.data)
      setLoading(false)
    }
    load()
  }, [query, refreshKey])

  const handleSearch = () => { setQuery(search) }

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', code: '', description: '', teacher_id: '' })
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, code: s.code, description: s.description || '', teacher_id: s.teacher_id || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code) return
    setSaving(true)
    const payload = {
      name: form.name,
      code: form.code,
      description: form.description,
      teacher_id: form.teacher_id || null,
    }
    if (editing) {
      await supabase.from('subjects').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('subjects').insert(payload)
    }
    setSaving(false)
    setModalOpen(false)
    setRefreshKey((k) => k + 1)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject?')) return
    await supabase.from('subjects').delete().eq('id', id)
    setRefreshKey((k) => k + 1)
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-sm text-gray-500">Manage academic subjects</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add Subject</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <Input
              className="pl-9" placeholder="Search by subject name..."
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
            <tr><Th>Code</Th><Th>Name</Th><Th>Assigned Teacher</Th><Th>Description</Th><Th className="text-right">Actions</Th></tr>
          </THead>
          <TBody>
            {subjects.map((s) => (
              <tr key={s.id}>
                <Td className="font-mono text-sm font-medium">{s.code}</Td>
                <Td className="font-medium">{s.name}</Td>
                <Td className="text-gray-600">{s.profiles?.full_name || '—'}</Td>
                <Td className="max-w-xs truncate text-gray-500">{s.description || '—'}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></Button>
                  </div>
                </Td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr><Td colSpan={5} className="py-8 text-center text-gray-400">No subjects found.</Td></tr>
            )}
          </TBody>
        </Table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Subject' : 'Add Subject'} className="max-w-lg">
        <div className="space-y-4">
          <Input label="Subject Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Subject Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} required />
          <Select
            label="Assigned Teacher"
            value={form.teacher_id}
            onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            options={[{ value: '', label: 'No teacher' }, ...teachers.map((t) => ({ value: t.id, label: t.full_name }))]}
          />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
