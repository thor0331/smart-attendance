import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { Table, THead, Th, TBody, Td } from '../../components/ui/Table'
import { Badge } from '../../components/ui/Badge'
import { formatDate, formatDateOnly, formatDuration, computeAttendanceStatus } from '../../lib/utils'
import { Download } from 'lucide-react'

export function ExportAttendance() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const statusLabel = (status) => {
    if (status === 'present') return 'Present'
    if (status === 'teacher_review') return 'Teacher Review'
    return 'Absent'
  }

  const statusVariant = (status) => {
    if (status === 'present') return 'success'
    if (status === 'teacher_review') return 'warning'
    return 'danger'
  }

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('attendance_sessions')
        .select('*, subjects(name,code), classrooms(name)')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
      if (data) setSessions(data)
      setLoading(false)
    }
    fetchSessions()
  }, [profile])

  useEffect(() => {
    if (!selectedSession) { setRecords([]); return }
    const fetchRecords = async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('*, profiles(full_name, email)')
        .eq('session_id', selectedSession.id)
        .order('marked_at', { ascending: true })
      if (data) setRecords(data)
    }
    fetchRecords()
  }, [selectedSession])

  const exportToExcel = () => {
    if (!selectedSession || records.length === 0) return
    const data = records.map((r, i) => ({
      '#': i + 1,
      Name: r.profiles?.full_name,
      Email: r.profiles?.email,
      Seat: r.seat_row !== null ? `R${r.seat_row + 1}C${r.seat_col + 1}` : 'N/A',
      'Entry Time': r.marked_at ? new Date(r.marked_at).toLocaleString() : 'N/A',
      'Exit Time': r.exit_verified_at ? new Date(r.exit_verified_at).toLocaleString() : 'N/A',
      Duration: formatDuration(r.marked_at, r.exit_verified_at),
      'Entry Verified': r.face_verified ? 'Yes' : 'No',
      'Exit Verified': r.exit_verified ? 'Yes' : 'No',
      Status: statusLabel(computeAttendanceStatus(r)),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
    ws['!cols'] = [
      { wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
    ]
    const subjectCode = selectedSession.subjects?.code || 'ATT'
    const date = formatDateOnly(selectedSession.created_at).replace(/\//g, '-')
    XLSX.writeFile(wb, `attendance-${subjectCode}-${date}.xlsx`)
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export Attendance</h1>
        <p className="text-sm text-gray-500">Download attendance records as Excel</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="flex-1 min-w-[250px]">
            <Select
              label="Select Session"
              value={selectedSession?.id || ''}
              onChange={(e) => setSelectedSession(sessions.find((s) => s.id === e.target.value))}
              options={sessions.map((s) => ({
                value: s.id,
                label: `${s.subjects?.name} (${s.subjects?.code}) — ${formatDate(s.created_at)} [${s.status}]`,
              }))}
              placeholder="Choose a session..."
            />
          </div>
          <Button onClick={exportToExcel} disabled={!selectedSession || records.length === 0}>
            <Download size={16} /> Export Excel
          </Button>
        </CardContent>
      </Card>

      {selectedSession && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">
              {selectedSession.subjects?.name} — {records.length} student{records.length !== 1 ? 's' : ''}
            </h2>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No attendance records for this session.</p>
            ) : (
              <Table>
                <THead>
                  <tr><Th>#</Th><Th>Name</Th><Th>Seat</Th><Th>Entry Time</Th><Th>Exit Time</Th><Th>Duration</Th><Th>Status</Th></tr>
                </THead>
                <TBody>
                  {records.map((r, i) => {
                    const status = computeAttendanceStatus(r)
                    return (
                      <tr key={r.id}>
                        <Td>{i + 1}</Td>
                        <Td className="font-medium">{r.profiles?.full_name}</Td>
                        <Td>{r.seat_row !== null ? `R${r.seat_row + 1}-C${r.seat_col + 1}` : '—'}</Td>
                        <Td className="text-xs text-gray-500">
                          {r.marked_at ? new Date(r.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </Td>
                        <Td className="text-xs text-gray-500">
                          {r.exit_verified_at ? new Date(r.exit_verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </Td>
                        <Td className="text-xs text-gray-500">
                          {formatDuration(r.marked_at, r.exit_verified_at)}
                        </Td>
                        <Td>
                          <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                        </Td>
                      </tr>
                    )
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}