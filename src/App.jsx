import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/shared/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { PageLoading } from './components/ui/Loading'

import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { SupabaseTest } from './pages/SupabaseTest'

import { AdminDashboard } from './pages/admin/Dashboard'
import { ManageUsers } from './pages/admin/ManageUsers'
import { ManageStudents } from './pages/admin/ManageStudents'
import { ManageTeachers } from './pages/admin/ManageTeachers'
import { ManageSubjects } from './pages/admin/ManageSubjects'
import { ManageClassrooms } from './pages/admin/ManageClassrooms'
import { ManageTimetable } from './pages/admin/ManageTimetable'
import { ExcelImport } from './pages/admin/ExcelImport'

import { TeacherDashboard } from './pages/teacher/Dashboard'
import { CreateSession } from './pages/teacher/CreateSession'
import { SessionQR } from './pages/teacher/SessionQR'
import { SeatMonitor } from './pages/teacher/SeatMonitor'
import { ExportAttendance } from './pages/teacher/ExportAttendance'
import { LiveAttendance } from './pages/teacher/LiveAttendance'

import { StudentDashboard } from './pages/student/Dashboard'
import { ScanQR } from './pages/student/ScanQR'
import { FaceVerify } from './pages/student/FaceVerify'
import { SeatSelection } from './pages/student/SeatSelection'
import { AttendanceReport } from './pages/student/AttendanceReport'
import { ExitScanQR } from './pages/student/ExitScanQR'

function RoleRouter() {
  const { profile, loading } = useAuth()

  if (loading) return <PageLoading />
  if (!profile) return <Navigate to="/login" replace />

  const role = profile.role
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'teacher') return <Navigate to="/teacher" replace />
  if (role === 'student') return <Navigate to="/student" replace />
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/supabase-test" element={<SupabaseTest />} />
        <Route path="/" element={<RoleRouter />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="students" element={<ManageStudents />} />
          <Route path="teachers" element={<ManageTeachers />} />
          <Route path="subjects" element={<ManageSubjects />} />
          <Route path="classrooms" element={<ManageClassrooms />} />
          <Route path="timetable" element={<ManageTimetable />} />
          <Route path="excel-import" element={<ExcelImport />} />
        </Route>

        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="sessions" element={<CreateSession />} />
          <Route path="session-qr/:id" element={<SessionQR />} />
          <Route path="live-attendance/:id" element={<LiveAttendance />} />
          <Route path="monitor" element={<SeatMonitor />} />
          <Route path="export" element={<ExportAttendance />} />
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="scan" element={<ScanQR />} />
          <Route path="face" element={<FaceVerify />} />
          <Route path="seat" element={<SeatSelection />} />
          <Route path="reports" element={<AttendanceReport />} />
          <Route path="exit-scan" element={<ExitScanQR />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
