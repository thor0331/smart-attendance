import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Loading } from '../../components/ui/Loading'
import { Camera, CameraOff, Check, ArrowRight, Fingerprint, MapPin } from 'lucide-react'

export function ScanQR() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const tokenParam = searchParams.get('token')
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [manualToken, setManualToken] = useState(tokenParam || '')
  const [alreadyMarked, setAlreadyMarked] = useState(false)
  const scannerRef = useRef(null)

  const Html5Qrcode = window.Html5Qrcode

  const validateToken = async (token) => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('attendance_sessions')
      .select('*, subjects(name,code), classrooms(name)')
      .eq('qr_token', token)
      .single()

    if (err || !data) {
      setError('Invalid or expired QR code. Please try again.')
      setLoading(false)
      return
    }

    if (data.status !== 'active') {
      setError(`This session is ${data.status}. It is no longer accepting attendance.`)
      setLoading(false)
      return
    }

    if (data.qr_expires_at && new Date(data.qr_expires_at) < new Date()) {
      setError('QR code has expired. Ask the teacher to refresh it.')
      setLoading(false)
      return
    }

    setSession(data)

    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', data.id)
      .eq('student_id', profile.id)
      .maybeSingle()

    if (existing) {
      setAlreadyMarked(true)
    } else {
      const { error: insertErr } = await supabase.from('attendance_records').insert({
        session_id: data.id,
        student_id: profile.id,
        status: 'present',
        marked_at: new Date().toISOString(),
      })
      if (insertErr) {
        setError('Failed to record attendance. Please try again.')
        setLoading(false)
        return
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (tokenParam) validateToken(tokenParam)
    else setLoading(false)
  }, [tokenParam]) /* eslint-disable-line */

  const startScanner = async () => {
    setScanning(true)
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          const url = new URL(decodedText)
          const token = url.searchParams.get('token')
          if (token) {
            scanner.stop().catch(() => {})
            setScanning(false)
            validateToken(token)
          }
        }
      )
    } catch {
      setError('Could not access camera. Enter the code manually.')
      setScanning(false)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualToken.trim()) validateToken(manualToken.trim())
  }

  if (loading) return <Loading />

  if (session) {
    const steps = [
      { icon: Check, label: 'QR Scanned', done: true },
      { icon: Fingerprint, label: 'Face Verification', done: false },
      { icon: MapPin, label: 'Seat Selection', done: false },
    ]

    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="rounded-full bg-emerald-100 p-4">
              <Check size={36} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Session Found!</h2>
            {alreadyMarked ? (
              <p className="text-amber-600 font-medium">You have already marked attendance for this session.</p>
            ) : (
              <p className="text-emerald-600 font-medium">QR verified successfully! Complete the remaining steps.</p>
            )}
            <div className="w-full space-y-2 text-center">
              <p className="text-lg font-semibold">{session.subjects?.name}</p>
              <p className="text-sm text-gray-500">{session.subjects?.code}</p>
              <p className="text-sm text-gray-500">{session.classrooms?.name}</p>
              <Badge variant={session.status}>{session.status}</Badge>
            </div>

            <div className="w-full space-y-2 border-t pt-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Attendance Steps</p>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    <step.icon size={14} className={step.done ? 'text-emerald-600' : 'text-gray-400'} />
                  </div>
                  <span className={`text-sm ${step.done ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                    {step.label}
                    {step.done && <span className="ml-1.5 text-emerald-600 text-xs">Done</span>}
                  </span>
                  {i < steps.length - 1 && <ArrowRight size={12} className="shrink-0 text-gray-300" />}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              {!alreadyMarked && (
                <Button onClick={() => navigate('/student/face')}>
                  Verify Face <span className="ml-1">&rarr;</span>
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/student/seat')}>
                Select Seat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scan QR Code</h1>
        <p className="text-sm text-gray-500">Scan the QR displayed by your teacher</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          {scanning ? (
            <div className="w-full">
              <div id="qr-reader" className="w-full overflow-hidden rounded-lg" />
              <Button variant="secondary" className="mt-3 w-full" onClick={stopScanner}>
                <CameraOff size={16} /> Stop Camera
              </Button>
            </div>
          ) : (
            <>
              <div className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                <Camera size={48} className="text-gray-300" />
              </div>
              <Button className="w-full" onClick={startScanner}>
                <Camera size={16} /> Open Camera
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">Or Enter Code Manually</h2></CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Paste QR token..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
            />
            <Button type="submit">Verify</Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent><p className="text-sm text-red-600">{error}</p></CardContent>
        </Card>
      )}
    </div>
  )
}
