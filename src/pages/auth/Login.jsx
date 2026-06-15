import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent } from '../../components/ui/Card'
import { LogIn } from 'lucide-react'

export function Login() {
  const { user, profile, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (user && profile) return <Navigate to={`/${profile.role}`} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await signIn(email, password)
    setSubmitting(false)
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : err.message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
              <LogIn className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to your attendance account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
