import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Loading } from '../../components/ui/Loading'
import { Table, THead, Th, TBody, Td } from '../../components/ui/Table'
import { formatDate } from '../../lib/utils'
import { BarChart3 } from 'lucide-react'

export function AttendanceReport() {
  const { profile } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecords = async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('*, attendance_sessions(subjects(name,code), date, status)')
        .eq('student_id', profile.id)
        .order('marked_at', { ascending: false })
      if (data) setRecords(data)
      setLoading(false)
    }
    fetchRecords()
  }, [profile])

  if (loading) return <Loading />

  const present = records.filter((r) => r.verified).length
  const total = records.length
  const rate = total > 0 ? Math.round((present / total) * 100) : 0

  const grouped = {}
  records.forEach((r) => {
    const key = r.attendance_sessions?.subjects?.name || 'Unknown'
    if (!grouped[key]) grouped[key] = { total: 0, present: 0 }
    grouped[key].total++
    if (r.verified) grouped[key].present++
  })

  const getRateColor = (pct) => {
    if (pct >= 75) return 'text-emerald-600'
    if (pct >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
        <p className="text-sm text-gray-500">Your attendance history</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500"><BarChart3 className="text-white" size={24} /></div>
            <div><p className="text-2xl font-bold">{present}/{total}</p><p className="text-sm text-gray-500">Sessions Attended</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500"><BarChart3 className="text-white" size={24} /></div>
            <div><p className={`text-2xl font-bold ${getRateColor(rate)}`}>{rate}%</p><p className="text-sm text-gray-500">Attendance Rate</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500"><BarChart3 className="text-white" size={24} /></div>
            <div><p className="text-2xl font-bold">{Object.keys(grouped).length}</p><p className="text-sm text-gray-500">Subjects</p></div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(grouped).length > 0 && (
        <Card>
          <CardHeader><h2 className="font-semibold">Per Subject Breakdown</h2></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(grouped).map(([subject, stats]) => {
                const pct = Math.round((stats.present / stats.total) * 100)
                return (
                  <div key={subject} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{subject}</p>
                      <p className="text-xs text-gray-500">{stats.present}/{stats.total} sessions</p>
                    </div>
                    <span className={`text-lg font-bold ${getRateColor(pct)}`}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="font-semibold">All Records</h2></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No attendance records found.</p>
          ) : (
            <Table>
              <THead>
                <tr><Th>Date</Th><Th>Subject</Th><Th>Status</Th><Th>Seat</Th><Th>Face Verified</Th></tr>
              </THead>
              <TBody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <Td className="text-xs">{formatDate(r.marked_at)}</Td>
                    <Td className="font-medium">{r.attendance_sessions?.subjects?.name} <span className="text-xs text-gray-400">({r.attendance_sessions?.subjects?.code})</span></Td>
                    <Td>
                      <Badge variant={r.verified ? 'present' : 'absent'}>
                        {r.verified ? 'Present' : 'Pending'}
                      </Badge>
                    </Td>
                    <Td>{r.seat_row !== null ? `R${r.seat_row + 1}-C${r.seat_col + 1}` : '—'}</Td>
                    <Td>{r.verified ? 'Yes' : 'No'}</Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
