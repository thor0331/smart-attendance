import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useFaceApi } from '../../hooks/useFaceApi'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { Camera, CameraOff, Upload, Check, X, AlertCircle, RefreshCw } from 'lucide-react'

export function FaceVerify() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { loaded: faceLoaded, error: faceError, compareFaces } = useFaceApi()
  const webcamRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState(null)
  const [pendingRecord, setPendingRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchPending = async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('*, attendance_sessions!inner(id, subject_id, subjects(name,code), status)')
        .eq('student_id', profile.id)
        .eq('face_verified', false)
        .order('marked_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) setPendingRecord(data)
      setLoading(false)
    }
    fetchPending()
  }, [profile])

  const stopCamera = () => {
    if (webcamRef.current?.srcObject) {
      webcamRef.current.srcObject.getTracks().forEach((t) => t.stop())
      webcamRef.current.srcObject = null
    }
    setStreaming(false)
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream
        setStreaming(true)
      }
    } catch {
      alert('Camera access denied. Please upload a photo instead.')
    }
  }

  const capturePhoto = () => {
    const canvas = document.createElement('canvas')
    const video = webcamRef.current
    if (!video) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(dataUrl)
    stopCamera()
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCapturedImage(reader.result)
    reader.readAsDataURL(file)
  }

  const handleVerify = async () => {
    if (!capturedImage || !pendingRecord || !profile.avatar_url) return
    setVerifying(true)
    setResult(null)

    try {
      const { match, distance, error: compareErr } = await compareFaces(capturedImage, profile.avatar_url)

      if (compareErr) {
        setResult({ success: false, message: compareErr })
        setVerifying(false)
        return
      }

      if (!match) {
        setResult({
          success: false,
          message: `Face does not match registered photo. Distance: ${distance.toFixed(3)} (threshold: 0.6)`,
        })
        setVerifying(false)
        return
      }

      const blob = await (await fetch(capturedImage)).blob()
      const fileName = `${profile.id}/${pendingRecord.id}-${Date.now()}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('face-images')
        .upload(fileName, blob, { contentType: 'image/jpeg' })

      if (uploadErr) {
        setResult({ success: false, message: 'Failed to upload verification image' })
        setVerifying(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('face-images').getPublicUrl(fileName)
      setUploading(true)

      const { error: updateErr } = await supabase
        .from('attendance_records')
        .update({ face_image_url: publicUrl, face_verified: true, verified: true })
        .eq('id', pendingRecord.id)

      setUploading(false)

      if (updateErr) {
        setResult({ success: false, message: 'Failed to update attendance record' })
        setVerifying(false)
        return
      }

      setResult({
        success: true,
        message: `Face verified! Match distance: ${distance.toFixed(3)}`,
        faceImage: publicUrl,
      })
    } catch (err) {
      setResult({ success: false, message: 'Verification failed. Please try again.' })
      console.error('Face verification error:', err)
    }
    setVerifying(false)
  }

  if (loading) return <Loading />

  if (!pendingRecord) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Check size={48} className="text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900">No Pending Verification</h2>
            <p className="text-sm text-gray-500">All face verifications are complete. Scan a QR code to start a new session.</p>
            <Button onClick={() => navigate('/student/scan')}>Scan QR</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (result?.success) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div className="rounded-full bg-emerald-100 p-4">
              <Check size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Face Verified!</h2>
            <p className="text-center text-sm text-green-600 font-medium">{result.message}</p>
            {result.faceImage && (
              <img src={result.faceImage} alt="Verification" className="h-24 w-24 rounded-full border-2 border-emerald-300 object-cover" />
            )}
            <div className="w-full space-y-1 text-center text-sm text-gray-500">
              <p>Subject: {pendingRecord.attendance_sessions?.subjects?.name}</p>
              <p>Next: Select your seat</p>
            </div>
            <Button onClick={() => navigate('/student/seat')}>
              Select Seat <span className="ml-1">&rarr;</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Face Verification</h1>
        <p className="text-sm text-gray-500">Match your face with the registered photo</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{pendingRecord.attendance_sessions?.subjects?.name || 'Session'}</h2>
            {pendingRecord.attendance_sessions?.subjects?.code && (
              <span className="text-xs text-gray-400">{pendingRecord.attendance_sessions.subjects.code}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!faceLoaded && !faceError && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loading />
              <p className="text-sm text-gray-500">Loading face detection models...</p>
              <p className="text-xs text-gray-400">This may take a moment on first use</p>
            </div>
          )}

          {faceError && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <AlertCircle size={24} className="text-red-500" />
              <p className="text-sm text-red-600">{faceError}</p>
              <p className="text-xs text-red-400">Face comparison will be skipped. You can still upload a photo.</p>
            </div>
          )}

          {profile?.avatar_url && (
            <div className="flex items-center gap-3 rounded-lg bg-indigo-50 p-3">
              <img
                src={profile.avatar_url}
                alt="Registered"
                className="h-12 w-12 rounded-full border-2 border-indigo-300 object-cover"
              />
              <div>
                <p className="text-xs font-medium text-indigo-700">Registered Photo</p>
                <p className="text-xs text-indigo-500">This is the photo on file</p>
              </div>
            </div>
          )}

          {!profile?.avatar_url && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-sm text-amber-700">No registered photo found.</p>
              <p className="text-xs text-amber-600">Contact admin to upload your admission photo.</p>
            </div>
          )}

          <div className="border-t pt-4">
            {capturedImage ? (
              <div className="space-y-3">
                <div className="relative">
                  <img src={capturedImage} alt="Captured" className="w-full rounded-lg" />
                  {result && !result.success && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/20 backdrop-blur-sm">
                      <div className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-lg">
                        <X size={16} className="inline mr-1" /> Not Matched
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => { setCapturedImage(null); setResult(null) }}>
                    <RefreshCw size={14} /> Retake
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleVerify}
                    disabled={verifying || !faceLoaded || !profile?.avatar_url}
                  >
                    {verifying ? 'Verifying...' : 'Verify Face'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {streaming ? (
                  <div className="space-y-3">
                    <video ref={webcamRef} autoPlay playsInline muted className="w-full rounded-lg" />
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={capturePhoto} disabled={!faceLoaded}>
                        <Camera size={16} /> Capture
                      </Button>
                      <Button variant="secondary" onClick={stopCamera}>
                        <CameraOff size={16} /> Stop
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                      <Camera size={48} className="text-gray-300" />
                    </div>
                    <Button className="w-full" onClick={startCamera}>
                      <Camera size={16} /> Open Camera
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs text-gray-400">
                        <span className="bg-white px-2">or</span>
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <Upload size={16} /> Upload Photo
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </>
                )}
              </div>
            )}
          </div>

          {result && !result.success && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <X size={16} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-sm text-red-600">{result.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card>
            <CardContent className="flex items-center gap-3 py-6">
              <Loading />
              <p className="text-sm font-medium text-gray-700">Saving verification...</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
