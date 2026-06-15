import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Card, CardContent } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { QRCodeCanvas } from 'qrcode.react'
import { Copy, Users, CheckCircle, XCircle, RefreshCw, LogOut, QrCode } from 'lucide-react'

export function SessionQR() {
  const { id } = useParams()
  const loc = useLocation()
  const navigate = useNavigate()
  const [session, setSession] = useState(loc.state?.session || null)
  const [students, setStudents] = useState(0)
  const [loading, setLoading] = useState(!session)
  const [copied, setCopied] = useState(false)
  const [ending, setEnding] = useState(false)
  const [showExitQR, setShowExitQR] = useState(false)
  const intervalRef = useRef(null)

  const entryQrValue = session ? `${window.location.origin}/student/scan?session=${session.id}&token=${session.qr_token}` : ''
  const exitQrValue = session?.exit_qr_token ? `${window.location.origin}/student/exit-scan?session=${session.id}&token=${session.exit_qr_token}` : ''

  useEffect(() => {
    if (!id) return
    const fetchSession = async () => {
      const { data } = await supabase.from('attendance_sessions').select('*').eq('id', id).single()
      if (data) setSession(data)
      setLoading(false)
    }
    if (!loc.state?.session) fetchSession()
    else setLoading(false)
  }, [id, loc.state])

  useEffect(() => {
    if (!session || session.status !== 'active') return
    const refreshToken = async () => {
      const newToken = crypto.randomUUID()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ qr_token: newToken, qr_expires_at: expiresAt })
        .eq('id', session.id)
        .select()
        .single()
      if (!error && data) {
        setSession(data)
      }
    }
    intervalRef.current = setInterval(refreshToken, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session?.id, session?.status])

  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel(`session-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records', filter: `session_id=eq.${session.id}` }, () => {
        supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('session_id', session.id).then(({ count }) => {
          if (count !== null) setStudents(count)
        })
      })
      .subscribe()

    supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('session_id', session.id).then(({ count }) => {
      if (count !== null) setStudents(count)
    })

    return () => { supabase.removeChannel(channel) }
  }, [session?.id])

  const handleEndSession = async () => {
    if (!confirm('End this session? An exit QR code will be generated for students to scan on their way out.')) return
    setEnding(true)
    if (intervalRef.current) clearInterval(intervalRef.current)

    const exitToken = crypto.randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('attendance_sessions')
      .update({
        status: 'completed',
        end_time: now.toISOString(),
        exit_qr_token: exitToken,
        exit_qr_expires_at: expiresAt,
      })
      .eq('id', session.id)
      .select()
      .single()

    if (!error && data) {
      setSession(data)
      setShowExitQR(true)
    }
    setEnding(false)
  }

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <Loading />

  if (!session) return (
    <Card>
      <CardContent className="py-12 text-center text-gray-500">Session not found.</CardContent>
    </Card>
  )

  const isActive = session.status === 'active'

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance QR</h1>
          <p className="text-sm text-gray-500">
            {isActive ? 'Students scan this QR to mark attendance' : showExitQR ? 'Exit QR ready - students scan to verify exit' : 'Session ended'}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {isActive ? <><CheckCircle size={14} /> Active</> : <><XCircle size={14} /> Ended</>}
        </div>
      </div>

      {showExitQR ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2">
              <LogOut size={16} className="text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700">Exit QR Code</span>
            </div>
            <div className="relative mb-2">
              <QRCodeCanvas value={exitQrValue} size={280} className="rounded-xl border-2 border-indigo-100 shadow-sm" />
            </div>
            <span className="flex items-center gap-1.5 text-xs text-amber-600 mb-3">
              <RefreshCw size={12} /> Expires in 5 minutes
            </span>
            <p className="text-sm text-gray-500 text-center mb-4">
              Students scan this QR code on their way out to complete exit verification.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleCopy(exitQrValue)}>
                {copied ? <><CheckCircle size={14} /> Copied</> : <><Copy size={14} /> Copy Exit Link</>}
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/teacher/live-attendance/${session.id}`)}>
                <Users size={14} /> View Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            {session.session_code && (
              <div className="mb-4 text-center">
                <p className="text-xs text-gray-400">Session Code</p>
                <p className="text-2xl font-bold tracking-wider text-indigo-700">{session.session_code}</p>
              </div>
            )}
            <div className="relative mb-2">
              <QRCodeCanvas value={entryQrValue} size={280} className="rounded-xl border-2 border-indigo-100 shadow-sm" />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm">
                  <p className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">Session Ended</p>
                </div>
              )}
            </div>
            {isActive && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 mb-3">
                <RefreshCw size={12} /> Refreshes every 5 seconds
              </span>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleCopy(entryQrValue)}>
                {copied ? <><CheckCircle size={14} /> Copied</> : <><Copy size={14} /> Copy Link</>}
              </Button>
              {isActive && (
                <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={handleEndSession} disabled={ending}>
                  {ending ? 'Ending...' : <><XCircle size={14} /> End Session</>}
                </Button>
              )}
            </div>
            {!isActive && !showExitQR && session.exit_qr_token && (
              <div className="mt-4 w-full border-t pt-4 text-center">
                <Button variant="secondary" size="sm" onClick={() => setShowExitQR(true)}>
                  <QrCode size={14} /> Show Exit QR
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Users size={18} />
            <span className="text-sm font-medium">Students Present</span>
          </div>
          <span className="text-2xl font-bold text-indigo-700">{students}</span>
        </CardContent>
      </Card>

      {isActive && (
        <Button variant="secondary" className="w-full" onClick={() => window.open(`/teacher/live-attendance/${session.id}`, '_blank')}>
          <Users size={16} /> Live Attendance Monitor
        </Button>
      )}
    </div>
  )
}