import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Loading } from '../../components/ui/Loading'
import { LogOut, Check, ArrowRight, Fingerprint, AlertCircle } from 'lucide-react'

export function ExitScanQR() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const sessionParam = searchParams.get('session')
  const tokenParam = searchParams.get('token')
  const [session, setSession] = useState(null)
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tokenParam || !sessionParam) {
      setError('Invalid exit QR link.')
      setLoading(false)
      return
    }

    const validateExitToken = async () => {
      const { data: sess, error: sessErr } = await supabase
        .from('attendance_sessions')
        .select('*, subjects(name,code), classrooms(name)')
        .eq('exit_qr_token', tokenParam)
        .single()

      if (sessErr || !sess) {
        setError('Invalid or expired exit QR code.')
        setLoading(false)
        return
      }

      if (sess.status !== 'completed') {
        setError('Session is still active. Complete entry attendance first.')
        setLoading(false)
        return
      }

      if (sess.exit_qr_expires_at && new Date(sess.exit_qr_expires_at) < new Date()) {
        setError('Exit QR code has expired. Ask your teacher to generate a new one.')
        setLoading(false)
        return
      }

      setSession(sess)

      const { data: rec } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('session_id', sess.id)
        .eq('student_id', profile.id)
        .maybeSingle()

      if (!rec) {
        setError('No entry attendance record found. You must scan the entry QR first.')
        setLoading(false)
        return
      }

      if (rec.exit_verified) {
        setError('Exit already verified for this session.')
        setLoading(false)
        return
      }

      setRecord(rec)
      setLoading(false)
    }

    validateExitToken()
  }, [tokenParam, sessionParam, profile])

  const handleProceedToVerify = () => {
    navigate(`/student/face?mode=exit&recordId=${record.id}&sessionId=${session.id}`)
  }

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-red-100 p-4">
              <AlertCircle size={36} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Exit Scan Failed</h2>
            <p className="text-red-600 font-medium">{error}</p>
            <Button variant="secondary" onClick={() => navigate('/student')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (session && record) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="rounded-full bg-indigo-100 p-4">
              <LogOut size={36} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Exit Verification</h2>
            <p className="text-emerald-600 font-medium">Exit QR verified! Complete face verification to confirm exit.</p>
            <div className="w-full space-y-2 text-center">
              <p className="text-lg font-semibold">{session.subjects?.name}</p>
              <p className="text-sm text-gray-500">{session.subjects?.code}</p>
              <p className="text-sm text-gray-500">{session.classrooms?.name}</p>
              <Badge variant="secondary">Exit</Badge>
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-indigo-50 p-3 w-full">
              <Fingerprint size={20} className="text-indigo-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-indigo-800">Face verification required</p>
                <p className="text-xs text-indigo-600">Match your face to confirm exit</p>
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={handleProceedToVerify}>
              Verify Face for Exit <ArrowRight size={18} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exit QR Scan</h1>
        <p className="text-sm text-gray-500">Use the exit QR code from your teacher</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="rounded-full bg-gray-100 p-4">
            <LogOut size={36} className="text-gray-400" />
          </div>
          <p className="text-gray-500">Scan the exit QR code displayed by your teacher after the session ends.</p>
        </CardContent>
      </Card>
    </div>
  )
}