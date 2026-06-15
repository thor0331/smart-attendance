import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card, CardContent } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Table, THead, Th, TBody, Td } from '../../components/ui/Table'
import { Loading } from '../../components/ui/Loading'
import { Pencil, Trash2, Plus, Search, Upload, X } from 'lucide-react'

const DEPARTMENTS = [
  { value: '', label: 'No Department' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Information Science', label: 'Information Science' },
  { value: 'Electronics & Communication', label: 'Electronics & Communication' },
  { value: 'Mechanical', label: 'Mechanical' },
  { value: 'Civil', label: 'Civil' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Physics', label: 'Physics' },
]

export function ManageTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', department: '' })
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let q = supabase.from('profiles').select('*').eq('role', 'teacher').order('full_name')
      if (query) {
        q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,department.ilike.%${query}%`)
      }
      const { data } = await q
      if (data) setTeachers(data)
      setLoading(false)
    }
    load()
  }, [query, refreshKey])

  const handleSearch = () => { setQuery(search) }

  const resetForm = () => {
    setForm({ full_name: '', email: '', department: '' })
    setPhotoFile(null)
    setPhotoPreview(null)
    setEditing(null)
  }

  const openCreate = () => { resetForm(); setModalOpen(true) }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ full_name: t.full_name || '', email: t.email || '', department: t.department || '' })
    setPhotoPreview(t.avatar_url || null)
    setModalOpen(true)
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadPhoto = async (teacherId) => {
    if (!photoFile) return null
    setPhotoUploading(true)
    const ext = photoFile.name.split('.').pop()
    const path = `${teacherId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('teacher-photos').upload(path, photoFile)
    if (error) { setPhotoUploading(false); return null }
    const { data: { publicUrl } } = supabase.storage.from('teacher-photos').getPublicUrl(path)
    setPhotoUploading(false)
    return publicUrl
  }

  const handleSave = async () => {
    if (!form.full_name || !form.email) return
    setSaving(true)

    if (editing) {
      const updates = { full_name: form.full_name, department: form.department }
      if (photoFile) {
        const url = await uploadPhoto(editing.id)
        if (url) updates.avatar_url = url
      }
      await supabase.from('profiles').update(updates).eq('id', editing.id)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: 'Teach@' + Math.random().toString(36).slice(2, 8),
        options: { data: { full_name: form.full_name, role: 'teacher' } },
      })
      if (error || !data?.user) { setSaving(false); return }
      const updates = { department: form.department }
      if (photoFile) {
        const url = await uploadPhoto(data.user.id)
        if (url) updates.avatar_url = url
      }
      await supabase.from('profiles').update(updates).eq('id', data.user.id)
    }

    setSaving(false)
    setModalOpen(false)
    resetForm()
    setRefreshKey((k) => k + 1)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this teacher? Associated timetable entries will be unassigned.')) return
    await supabase.from('profiles').delete().eq('id', id)
    setRefreshKey((k) => k + 1)
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Teachers</h1>
          <p className="text-sm text-gray-500">Add, edit, and manage teacher profiles</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Add Teacher</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <Input
              className="pl-9" placeholder="Search by name, email, or department..."
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
            <tr>
              <Th>Photo</Th>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Department</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </THead>
          <TBody>
            {teachers.map((t) => (
              <tr key={t.id}>
                <Td>
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.full_name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {t.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </Td>
                <Td className="font-medium text-gray-900">{t.full_name}</Td>
                <Td className="text-gray-500">{t.email}</Td>
                <Td className="text-gray-600">{t.department || '—'}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(t.id)}><Trash2 size={14} /></Button>
                  </div>
                </Td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><Td colSpan={5} className="py-8 text-center text-gray-400">No teachers found.</Td></tr>
            )}
          </TBody>
        </Table>
      </Card>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title={editing ? 'Edit Teacher' : 'Add Teacher'} className="max-w-xl">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <div className="relative shrink-0">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Preview" className="h-20 w-20 rounded-full object-cover" />
                  <button type="button" onClick={clearPhoto} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 cursor-pointer"><X size={12} /></button>
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100"><Upload size={24} className="text-gray-400" /></div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Photo</p>
              <p className="text-xs text-gray-400">PNG, JPG up to 2MB</p>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handlePhotoSelect}
                className="mt-2 block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100" />
            </div>
          </div>

          <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} required />
          <Select label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} options={DEPARTMENTS} />

          {!editing && <p className="text-xs text-gray-400">A verification email will be sent to the teacher.</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || photoUploading}>
              {saving || photoUploading ? 'Saving...' : editing ? 'Update' : 'Add Teacher'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
