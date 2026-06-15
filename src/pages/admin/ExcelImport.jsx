import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Table, THead, Th, TBody, Td } from '../../components/ui/Table'
import { FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export function ExcelImport() {
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet)
      const mapped = json.map((r, i) => ({
        _id: i,
        usn: String(r.USN || r.usn || '').trim(),
        full_name: String(r.NAME || r.name || r.Name || '').trim(),
        email: String(r.EMAIL || r.email || '').trim().toLowerCase(),
        role: String(r.ROLE || r.role || 'student').trim().toLowerCase(),
      }))
      setRows(mapped)
    }
    reader.readAsArrayBuffer(file)
  }

  const clearFile = () => {
    setRows([])
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleImport = async () => {
    setImporting(true)
    const imported = []
    const failed = []

    for (const row of rows) {
      try {
        if (!row.email || !row.full_name) {
          failed.push({ ...row, error: 'Missing required fields (NAME or EMAIL)' })
          continue
        }
        if (!['student', 'teacher', 'admin'].includes(row.role)) {
          failed.push({ ...row, error: `Invalid role: "${row.role}"` })
          continue
        }
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.eq.${row.email},usn.eq.${row.usn}`)
          .maybeSingle()
        if (existing) {
          failed.push({ ...row, error: 'Duplicate email or USN' })
          continue
        }
        const password = `Import@${Math.random().toString(36).slice(2, 8)}`
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: row.email,
          password,
          options: { data: { full_name: row.full_name, role: row.role } },
        })
        if (authErr || !authData?.user) {
          failed.push({ ...row, error: authErr?.message || 'Auth creation failed' })
          continue
        }
        if (row.usn) {
          await supabase.from('profiles').update({ usn: row.usn }).eq('id', authData.user.id)
        }
        imported.push({ ...row, password })
      } catch (err) {
        failed.push({ ...row, error: err.message })
      }
    }

    setResult({ imported: imported.length, failed: failed.length, details: { imported, failed } })
    setImporting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Excel Import</h1>
        <p className="mt-1 text-sm text-gray-500">Bulk import students and teachers from .xlsx file</p>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100">
              <FileSpreadsheet size={28} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Upload Excel File</h3>
              <p className="text-sm text-gray-500">Columns: USN, NAME, EMAIL, ROLE (student/teacher/admin)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="mt-2 block w-full text-sm text-gray-500 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            {rows.length > 0 && (
              <Button variant="secondary" onClick={clearFile}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">{result.imported} Imported</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-red-500" />
                <span className="text-sm font-medium text-red-700">{result.failed} Failed</span>
              </div>
              {result.imported > 0 && (
                <p className="text-xs text-gray-400">Passwords are shown below for imported records.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Preview ({rows.length} records)</h2>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : `Import ${rows.length} Records`}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <THead>
                  <tr>
                    <Th>USN</Th>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    {result && <Th>Status</Th>}
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => {
                    const status = result?.details.imported.find((r) => r.email === row.email)
                    const err = result?.details.failed.find((r) => r.email === row.email)
                    return (
                      <tr key={row._id}>
                        <Td className="font-mono text-xs">{row.usn || '—'}</Td>
                        <Td className="font-medium">{row.full_name}</Td>
                        <Td className="text-gray-500">{row.email}</Td>
                        <Td className="capitalize">{row.role}</Td>
                        {result && (
                          <Td>
                            {status ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 size={12} /> Imported
                              </span>
                            ) : err ? (
                              <span className="flex items-center gap-1 text-xs text-red-600" title={err.error}>
                                <AlertTriangle size={12} /> {err.error}
                              </span>
                            ) : null}
                          </Td>
                        )}
                      </tr>
                    )
                  })}
                </TBody>
              </Table>
            </div>
          </CardContent>
          {result?.details.imported.length > 0 && (
            <CardContent className="border-t">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Generated Passwords</h3>
              <div className="space-y-1 text-xs text-gray-500">
                {result.details.imported.map((r) => (
                  <div key={r.email}>
                    {r.email}: <span className="font-mono">{r.password}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
