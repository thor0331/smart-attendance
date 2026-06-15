import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card, CardContent } from '../../components/ui/Card'
import { UserPlus } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
]

export function Register() {
  const { user, profile, loading, signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'student' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return null
  if (user && profile) return <Navigate to={`/${profile.role}`} replace />

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { data, error: err } = await signUp(form.email, form.password, form.fullName, form.role)
    setSubmitting(false)
    if (err) {
      setError(err.message === 'User already registered'
        ? 'An account with this email already exists.'
        : err.message)
      return
    }
    const isConfirmed = !data?.user?.identities?.length
    navigate(isConfirmed ? '/login' : `/${form.role}`, {
      state: { message: 'Account created! Check your email for verification.' },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 pt-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
              <UserPlus className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
            <p className="mt-1 text-sm text-gray-500">
              Register for the attendance system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="fullName"
              placeholder="John Doe"
              value={form.fullName}
              onChange={handleChange}
              required
            />
            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <Select
              label="Role"
              name="role"
              value={form.role}
              onChange={handleChange}
              options={ROLE_OPTIONS}
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
