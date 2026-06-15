-- Smart Attendance System Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- 3. Classrooms
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT NOT NULL DEFAULT '',
  floor INTEGER DEFAULT 1,
  total_seats INTEGER NOT NULL DEFAULT 30,
  rows INTEGER NOT NULL DEFAULT 5,
  cols INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

-- 4. Timetable
CREATE TABLE timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

-- 5. Attendance Sessions
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  timetable_id UUID REFERENCES timetable(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Attendance Records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_row INTEGER,
  seat_col INTEGER,
  face_image_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- 7. Seat Allocations
CREATE TABLE seat_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_row INTEGER NOT NULL,
  seat_col INTEGER NOT NULL,
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, seat_row, seat_col),
  UNIQUE(session_id, student_id)
);

ALTER TABLE seat_allocations ENABLE ROW LEVEL SECURITY;

-- Storage bucket for face images
INSERT INTO storage.buckets (id, name, public) VALUES ('face-images', 'face-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for student photos (public for avatar display)
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Subjects: admins manage, everyone reads
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Admins can insert subjects" ON subjects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update subjects" ON subjects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete subjects" ON subjects FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Classrooms: admins manage, everyone reads
CREATE POLICY "Anyone can view classrooms" ON classrooms FOR SELECT USING (true);
CREATE POLICY "Admins can manage classrooms" ON classrooms FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Timetable: admins manage, teachers see theirs
CREATE POLICY "Anyone can view timetable" ON timetable FOR SELECT USING (true);
CREATE POLICY "Admins can manage timetable" ON timetable FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Attendance Sessions
CREATE POLICY "Users can view sessions" ON attendance_sessions FOR SELECT USING (true);
CREATE POLICY "Teachers can create sessions" ON attendance_sessions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "Teachers can update own sessions" ON attendance_sessions FOR UPDATE USING (teacher_id = auth.uid());
CREATE POLICY "Teachers can delete own sessions" ON attendance_sessions FOR DELETE USING (teacher_id = auth.uid());

-- Attendance Records
CREATE POLICY "Users can view attendance" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Students can mark attendance" ON attendance_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
);
CREATE POLICY "Students can update own records" ON attendance_records FOR UPDATE USING (student_id = auth.uid());

-- Seat Allocations
CREATE POLICY "Users can view seat allocations" ON seat_allocations FOR SELECT USING (true);
CREATE POLICY "Students can allocate seats" ON seat_allocations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
);
CREATE POLICY "Students can update own seat" ON seat_allocations FOR UPDATE USING (student_id = auth.uid());

-- Storage policy for face images
CREATE POLICY "Students can upload face images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'face-images' AND auth.role() = 'authenticated'
);
CREATE POLICY "Users can view face images" ON storage.objects FOR SELECT USING (
  bucket_id = 'face-images' AND auth.role() = 'authenticated'
);

-- Student-specific fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS usn TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS semester INTEGER DEFAULT 1;

-- Admin policy for managing all profiles
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Storage policy for student photos
CREATE POLICY "Authenticated users can manage student photos" ON storage.objects FOR ALL USING (
  bucket_id = 'student-photos' AND auth.role() = 'authenticated'
);

-- Add missing columns for QR and session code
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS session_code TEXT;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS qr_expires_at TIMESTAMPTZ;

-- Add status column to attendance_records
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';

-- 8. Face Embeddings table
CREATE TABLE face_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

ALTER TABLE face_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view face embeddings" ON face_embeddings FOR SELECT USING (true);
CREATE POLICY "Students can manage own embeddings" ON face_embeddings FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Admins can manage embeddings" ON face_embeddings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Add face_verified column to attendance_records
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT FALSE;

-- Teacher-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-photos', 'teacher-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Add assigned teacher to subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Realtime for attendance_records (for live attendance tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_sessions;

-- Exit Attendance Module
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS exit_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS exit_face_url TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS exit_verified_at TIMESTAMPTZ;

ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS exit_qr_token TEXT UNIQUE;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS exit_qr_expires_at TIMESTAMPTZ;
