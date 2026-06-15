import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Table, THead, Th, TBody, Td } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { Loading } from '../../components/ui/Loading'
import { Pencil, Trash2, Plus, Search } from 'lucide-react'

export function ManageUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'student' })
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (roleFilter) query = query.eq('role', roleFilter)
    if (search) query = query.ilike('full_name', `%${search}%`)
    const { data } = await query
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [roleFilter])

  const handleSearch = () => { fetchUsers() }

  const openEdit = (user) => {
    setEditing(user)
    setForm({ full_name: user.full_name, email: user.email, role: user.role })
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ full_name: '', email: '', role: 'student' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    if (editing) {
      await supabase.from('profiles').update({ full_name: form.full_name, role: form.role }).eq('id', editing.id)
    }
    setSaving(false)
    setModalOpen(false)
    fetchUsers()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    await supabase.from('profiles').delete().eq('id', id)
    fetchUsers()
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-sm text-gray-500">Teachers &amp; Students</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <Input
              className="pl-9"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'student', label: 'Student' },
            ]}
            className="w-40"
          />
          <Button variant="secondary" onClick={handleSearch}>Search</Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Actions</Th>
            </tr>
          </THead>
          <TBody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td className="font-medium">{u.full_name}</Td>
                <Td className="text-gray-500">{u.email}</Td>
                <Td><Badge variant={u.role}>{u.role}</Badge></Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Pencil size={14} />
                    </Button>
                    {u.role !== 'admin' && (
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(u.id)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><Td colSpan={4} className="text-center text-gray-400 py-8">No users found</Td></tr>
            )}
          </TBody>
        </Table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          <Input label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={[{ value: 'teacher', label: 'Teacher' }, { value: 'student', label: 'Student' }]} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
