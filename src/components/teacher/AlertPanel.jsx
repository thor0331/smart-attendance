import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { AlertTriangle, Clock, User, MapPin, CheckCircle, XCircle, EyeOff } from 'lucide-react'

function formatMissingDuration(seconds) {
  if (!seconds) return 'Just now'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs}h ${remMins}m`
  }
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function seatLabel(row, col) {
  return `${String.fromCharCode(65 + (row || 0))}${(col || 0) + 1}`
}

export function AlertPanel({ alerts, sessionId, onAlertResolved }) {
  const [processing, setProcessing] = useState({})

  const activeAlerts = alerts.filter((a) => a.status === 'active')
  const resolvedAlerts = alerts.filter((a) => a.status !== 'active')

  const handleAction = async (alert, action) => {
    setProcessing((prev) => ({ ...prev, [alert.id]: true }))

    const statusMap = {
      mark_present: 'marked_present',
      mark_absent: 'marked_absent',
      ignore: 'ignored',
    }

    await supabase
      .from('absence_alerts')
      .update({
        status: statusMap[action],
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alert.id)

    if (action === 'mark_present') {
      await supabase
        .from('seat_allocations')
        .update({ is_present: true, last_presence_check: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('student_id', alert.student_id)
    }

    setProcessing((prev) => ({ ...prev, [alert.id]: false }))
    if (onAlertResolved) onAlertResolved(alert.id, statusMap[action])
  }

  if (alerts.length === 0) return null

  return (
    <div className="space-y-4">
      {activeAlerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-semibold text-red-700">
                Active Alerts ({activeAlerts.length})
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-red-100 bg-red-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {alert.profiles?.full_name || 'Unknown Student'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin size={14} />
                      <span>Seat {seatLabel(alert.seat_row, alert.seat_col)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock size={14} />
                      <span>Missing for {formatMissingDuration(alert.duration)}</span>
                    </div>
                  </div>
                  <Badge variant="danger">ABSENT</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAction(alert, 'mark_present')}
                    disabled={processing[alert.id]}
                  >
                    <CheckCircle size={14} /> Present
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => handleAction(alert, 'mark_absent')}
                    disabled={processing[alert.id]}
                  >
                    <XCircle size={14} /> Absent
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAction(alert, 'ignore')}
                    disabled={processing[alert.id]}
                  >
                    <EyeOff size={14} /> Ignore
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {resolvedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-700">Resolved Alerts ({resolvedAlerts.length})</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {resolvedAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{alert.profiles?.full_name || 'Unknown'}</span>
                  <span className="text-gray-400">Seat {seatLabel(alert.seat_row, alert.seat_col)}</span>
                </div>
                <Badge variant={
                  alert.status === 'marked_present' ? 'success' :
                  alert.status === 'marked_absent' ? 'danger' : 'secondary'
                }>
                  {alert.status === 'marked_present' ? 'Present' :
                   alert.status === 'marked_absent' ? 'Absent' : 'Ignored'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}