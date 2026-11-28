-- =============================================================================
-- MAJARA ACADEMY (majara.7z-magic.com) — POSTGRESQL PRODUCTION SCHEMA
-- Fully Automated Schema Migration for Students, Courses, Lessons & Progress
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ACADEMY STUDENTS
CREATE TABLE IF NOT EXISTS academy_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT,
  must_set_password BOOLEAN NOT NULL DEFAULT TRUE,
  active_session_token TEXT,
  last_ip TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_academy_students_email_lower
ON academy_students (LOWER(TRIM(email)));

-- 2. ACADEMY COURSES
CREATE TABLE IF NOT EXISTS academy_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  cover_image TEXT,
  price_usd NUMERIC(10,2) DEFAULT 0,
  drive_folder_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_courses_published
ON academy_courses (is_published);

-- 3. ACADEMY LESSONS
CREATE TABLE IF NOT EXISTS academy_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  module_order INT NOT NULL DEFAULT 1,
  module_title TEXT NOT NULL,
  lesson_order INT NOT NULL DEFAULT 1,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'gdrive')),
  source_id TEXT NOT NULL,
  duration_label TEXT,
  resources_json JSONB DEFAULT '[]'::jsonb,
  is_free_preview BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academy_lessons_course_order
ON academy_lessons (course_id, module_order, lesson_order);

-- 4. STUDENT COURSE ENROLLMENTS
CREATE TABLE IF NOT EXISTS student_course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  granted_by TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_student_course_enrollment UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student
ON student_course_enrollments (student_id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_course
ON student_course_enrollments (course_id);

-- 5. STUDENT LESSON PROGRESS
CREATE TABLE IF NOT EXISTS student_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES academy_students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_position_sec INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_student_lesson_progress UNIQUE (student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_student
ON student_lesson_progress (student_id);
