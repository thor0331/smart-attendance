import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CHECK_INTERVAL = 30000
const ABSENCE_THRESHOLD = 300000
const FOREGROUND_THRESHOLD = 0.15

export function usePresenceMonitor({ sessionId, cv, videoRef, allocatedSeats, classroom }) {
  const [monitoring, setMonitoring] = useState(false)
  const [seatStatuses, setSeatStatuses] = useState({})
  const [alerts, setAlerts] = useState([])
  const [presenceScore, setPresenceScore] = useState(100)
  const [logs, setLogs] = useState([])
  const [cameraReady, setCameraReady] = useState(false)
  const [frame, setFrame] = useState(null)
  const [monitoringError, setMonitoringError] = useState(null)

  const intervalRef = useRef(null)
  const streamRef = useRef(null)
  const fgbgRef = useRef(null)
  const absenceTimersRef = useRef({})
  const seatStatusesRef = useRef({})
  const lastLogTimeRef = useRef({})

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch {
      setMonitoringError('Camera access denied. Please allow camera access.')
    }
  }, [videoRef])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !cv) return null
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setFrame(dataUrl)
    return { canvas, ctx, dataUrl }
  }, [videoRef, cv])

  const checkSeatOccupancy = useCallback((frameData) => {
    if (!cv || !frameData || !classroom) return {}

    const { canvas } = frameData
    const src = cv.matFromCanvas(canvas)
    const gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    if (!fgbgRef.current) {
      fgbgRef.current = new cv.BackgroundSubtractorMOG2(500, 16, true)
    }

    const fgMask = new cv.Mat()
    fgbgRef.current.apply(gray, fgMask)

    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
    cv.morphologyEx(fgMask, fgMask, cv.MORPH_OPEN, kernel)
    cv.morphologyEx(fgMask, fgMask, cv.MORPH_CLOSE, kernel)

    const seatOccupancy = {}
    const rows = classroom.rows
    const cols = classroom.cols
    const cellH = Math.floor(fgMask.rows / rows)
    const cellW = Math.floor(fgMask.cols / cols)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW
        const y = r * cellH
        const roi = fgMask.roi(new cv.Rect(x, y, cellW, cellH))
        const fgPixels = cv.countNonZero(roi)
        const totalPixels = cellW * cellH
        const ratio = fgPixels / totalPixels
        seatOccupancy[`${r}-${c}`] = ratio > FOREGROUND_THRESHOLD
        roi.delete()
      }
    }

    src.delete()
    gray.delete()
    fgMask.delete()
    kernel.delete()

    return seatOccupancy
  }, [cv, classroom])

  const logPresence = useCallback(async (sessionId, seatStatuses) => {
    const now = new Date()
    const logsToInsert = []

    for (const [key, status] of Object.entries(seatStatuses)) {
      const lastLog = lastLogTimeRef.current[key]
      if (lastLog && (now - lastLog) < CHECK_INTERVAL) continue
      lastLogTimeRef.current[key] = now

      const allocated = allocatedSeats.find(
        (a) => `${a.seat_row}-${a.seat_col}` === key
      )
      if (!allocated) continue

      logsToInsert.push({
        session_id: sessionId,
        student_id: allocated.student_id,
        seat_row: allocated.seat_row,
        seat_col: allocated.seat_col,
        is_present: status.is_present,
        checked_at: now.toISOString(),
      })
    }

    if (logsToInsert.length > 0) {
      const { data } = await supabase.from('seat_presence_logs').insert(logsToInsert).select()
      if (data) setLogs((prev) => [...data, ...prev].slice(0, 200))
    }
  }, [allocatedSeats])

  const processTick = useCallback(async () => {
    if (!cv || !sessionId) return

    const frameData = captureFrame()
    if (!frameData) return

    const occupancy = checkSeatOccupancy(frameData)

    const newSeatStatuses = { ...seatStatusesRef.current }
    const now = Date.now()
    const newAlerts = []

    for (const allocated of allocatedSeats) {
      const key = `${allocated.seat_row}-${allocated.seat_col}`
      const isOccupied = occupancy[key] || false

      const prevStatus = newSeatStatuses[key] || { is_present: false, absentSince: null, alerted: false }
      const wasPresent = prevStatus.is_present

      newSeatStatuses[key] = {
        is_present: isOccupied,
        absentSince: isOccupied ? null : (prevStatus.absentSince || now),
        alerted: isOccupied ? false : prevStatus.alerted,
      }

      if (wasPresent && !isOccupied) {
        newSeatStatuses[key].absentSince = now
        newSeatStatuses[key].alerted = false

        absenceTimersRef.current[key] = setTimeout(() => {
          if (!newSeatStatuses[key]?.is_present && !newSeatStatuses[key]?.alerted) {
            const alert = {
              session_id: sessionId,
              student_id: allocated.student_id,
              seat_row: allocated.seat_row,
              seat_col: allocated.seat_col,
              missing_since: new Date(newSeatStatuses[key].absentSince).toISOString(),
              duration: Math.floor((Date.now() - newSeatStatuses[key].absentSince) / 1000),
              status: 'active',
            }
            newSeatStatuses[key].alerted = true
            supabase.from('absence_alerts').insert(alert).select().then(({ data }) => {
              if (data) {
                setAlerts((prev) => {
                  const filtered = prev.filter((a) => a.status === 'active')
                  return [data[0], ...filtered]
                })
              }
            })
          }
        }, ABSENCE_THRESHOLD)
      }

      if (!wasPresent && isOccupied) {
        if (absenceTimersRef.current[key]) {
          clearTimeout(absenceTimersRef.current[key])
          delete absenceTimersRef.current[key]
        }
        supabase
          .from('absence_alerts')
          .update({ status: 'resolved', resolved_at: new Date().toISOString() })
          .eq('session_id', sessionId)
          .eq('student_id', allocated.student_id)
          .eq('status', 'active')
          .then(() => {
            setAlerts((prev) =>
              prev.map((a) =>
                a.student_id === allocated.student_id && a.status === 'active'
                  ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() }
                  : a
              )
            )
          })
      }
    }

    seatStatusesRef.current = newSeatStatuses
    setSeatStatuses(newSeatStatuses)

    const presentCount = Object.values(newSeatStatuses).filter((s) => s.is_present).length
    const totalAllocated = allocatedSeats.length
    const score = totalAllocated > 0 ? Math.round((presentCount / totalAllocated) * 100) : 100
    setPresenceScore(score)

    await logPresence(sessionId, newSeatStatuses)

    const allocatedCount = allocatedSeats.length
    const presentCountForScore = Object.values(newSeatStatuses).filter((s) => s.is_present).length
    const seatPresencePct = allocatedCount > 0 ? (presentCountForScore / allocatedCount) * 100 : 100
    for (const allocated of allocatedSeats) {
      const key = `${allocated.seat_row}-${allocated.seat_col}`
      const status = newSeatStatuses[key]
      if (status) {
        const entryScore = 40
        const seatScore = Math.round(seatPresencePct * 0.4)
        const exitScore = 0
        const totalScore = entryScore + seatScore + exitScore
        supabase
          .from('attendance_records')
          .update({
            presence_score: totalScore,
            missing_duration: status.absentSince
              ? Math.floor((Date.now() - status.absentSince) / 1000)
              : 0,
          })
          .eq('session_id', sessionId)
          .eq('student_id', allocated.student_id)
          .then(() => {})
      }
    }
  }, [cv, sessionId, captureFrame, checkSeatOccupancy, allocatedSeats, logPresence])

  const startMonitoring = useCallback(async () => {
    setMonitoringError(null)
    await startCamera()

    if (!sessionId) {
      setMonitoringError('No active session selected.')
      return
    }

    await supabase
      .from('attendance_sessions')
      .update({ monitoring_status: 'active' })
      .eq('id', sessionId)

    setMonitoring(true)
  }, [sessionId, startCamera])

  const stopMonitoring = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    Object.values(absenceTimersRef.current).forEach((t) => clearTimeout(t))
    absenceTimersRef.current = {}

    stopCamera()
    setMonitoring(false)
    setFrame(null)

    if (fgbgRef.current) {
      fgbgRef.current.delete()
      fgbgRef.current = null
    }

    if (sessionId) {
      await supabase
        .from('attendance_sessions')
        .update({ monitoring_status: 'inactive' })
        .eq('id', sessionId)
    }
  }, [sessionId, stopCamera])

  useEffect(() => {
    if (monitoring && cv && cameraReady) {
      processTick()
      intervalRef.current = setInterval(processTick, CHECK_INTERVAL)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [monitoring, cv, cameraReady, processTick])

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!sessionId) return
      const { data } = await supabase
        .from('absence_alerts')
        .select('*, profiles(full_name)')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setAlerts(data)
    }
    fetchAlerts()

    const channel = supabase
      .channel(`alerts-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'absence_alerts',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data } = await supabase
            .from('absence_alerts')
            .select('*, profiles(full_name)')
            .eq('id', payload.new.id)
            .single()
          if (data) setAlerts((prev) => [data, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setAlerts((prev) =>
            prev.map((a) => (a.id === payload.new.id ? { ...a, ...payload.new } : a))
          )
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  useEffect(() => {
    return () => {
      Object.values(absenceTimersRef.current).forEach((t) => clearTimeout(t))
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  return {
    monitoring,
    startMonitoring,
    stopMonitoring,
    alerts,
    seatStatuses,
    presenceScore,
    logs,
    frame,
    cameraReady,
    monitoringError,
  }
}