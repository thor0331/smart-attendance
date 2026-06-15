import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export function SupabaseTest() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('_dummy').select('*').limit(1).maybeSingle()
        if (error && error.code !== 'PGRST116') throw error
        setStatus('connected')
      } catch {
        setStatus('error')
      }
    }
    testConnection()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-bold text-gray-900">Supabase Connection Test</h1>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <p className="text-sm text-gray-500">Testing connection...</p>
            </div>
          )}

          {status === 'connected' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 size={48} className="text-emerald-500" />
              <p className="text-lg font-semibold text-emerald-600">
                Supabase Connected Successfully
              </p>
              <p className="text-sm text-gray-500">
                Your Supabase client is configured and reachable.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <XCircle size={48} className="text-red-500" />
              <p className="text-lg font-semibold text-red-600">Connection Failed</p>
              <p className="text-sm text-gray-500">
                Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
