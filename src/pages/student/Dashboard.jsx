import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { ScanQrCode, BookOpen, BarChart3, ArrowRight, Fingerprint, MapPin, CheckCircle } from 'lucide-react'

export function StudentDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState({ subjects: [], stats: { total: 0, present: 0 } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: records } = await supabase
        .from('attendance_records')
        .select('verified, attendance_sessions(subjects(id, name))')
        .eq('student_id', profile.id)

      if (records) {
        const total = records.length
        const present = records.filter((r) => r.verified).length

        const subjectMap = {}
        records.forEach((r) => {
          const sub = r.attendance_sessions?.subjects
          if (sub) {
            if (!subjectMap[sub.id]) {
              subjectMap[sub.id] = { id: sub.id, name: sub.name, total: 0, present: 0 }
            }
            subjectMap[sub.id].total++
            if (r.verified) subjectMap[sub.id].present++
          }
        })

        setData({
          subjects: Object.values(subjectMap),
          stats: { total, present },
        })
      }
      setLoading(false)
    }
    fetchData()
  }, [profile])

  if (loading) return <Loading />

  const percentage = data.stats.total > 0
    ? Math.round((data.stats.present / data.stats.total) * 100)
    : 0

  const getPercentageColor = (pct) => {
    if (pct >= 75) return 'text-emerald-600'
    if (pct >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  const getBarColor = (pct) => {
    if (pct >= 75) return 'bg-emerald-500'
    if (pct >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hello, {profile?.full_name}</h1>
        <p className="mt-1 text-sm text-gray-500">Student Dashboard</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <CheckCircle size={16} className="text-indigo-600" />
            Attendance Flow
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {[
              { icon: ScanQrCode, label: 'Scan QR', desc: 'Teacher shows QR', action: '/student/scan' },
              { icon: Fingerprint, label: 'Face Verify', desc: 'Match your photo', action: '/student/face' },
              { icon: MapPin, label: 'Select Seat', desc: 'Pick your seat', action: '/student/seat' },
              { icon: CheckCircle, label: 'Complete', desc: 'Attendance marked', action: '/student/reports' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(step.action)}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                  <step.icon size={18} className="text-indigo-600" />
                </div>
                <span className="text-xs font-medium text-gray-700">{step.label}</span>
                <span className="text-[10px] text-gray-400">{step.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {data.stats.present}/{data.stats.total}
              </p>
              <p className="text-sm text-gray-500">Attendance Summary</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${getPercentageColor(percentage)}`}>
                {percentage}%
              </p>
              <p className="text-sm text-gray-500">Attendance Percentage</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen size={16} />
            My Subjects
          </h2>
        </CardHeader>
        <CardContent>
          {data.subjects.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No subjects found. Scan a QR code to start recording attendance.
            </p>
          ) : (
            <div className="space-y-4">
              {data.subjects.map((sub) => {
                const subPct = sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 0
                return (
                  <div key={sub.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{sub.name}</span>
                      <span className={`text-sm font-medium ${getPercentageColor(subPct)}`}>
                        {sub.present}/{sub.total} ({subPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full transition-all ${getBarColor(subPct)}`}
                        style={{ width: `${subPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
              <ScanQrCode size={32} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mark Attendance</h3>
              <p className="mt-1 text-sm text-gray-500">Scan the QR code from your teacher</p>
            </div>
            <Button size="lg" onClick={() => navigate('/student/scan')}>
              Scan QR
              <ArrowRight size={18} />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <BarChart3 size={32} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Full Reports</h3>
              <p className="mt-1 text-sm text-gray-500">View detailed attendance history</p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/student/reports')}
            >
              View Reports
              <ArrowRight size={18} />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
