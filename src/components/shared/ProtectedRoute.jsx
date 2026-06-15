import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoading } from '../ui/Loading'

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageLoading />
  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={`/${profile.role}`} replace />
  }

  return children
}
