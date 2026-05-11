-- CPD Tracker V53 Login System
-- Run this once in Supabase SQL Editor.

ALTER TABLE staff_cpd
ADD COLUMN IF NOT EXISTS reset_code TEXT;

ALTER TABLE staff_cpd
ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMPTZ;

-- Optional but recommended if not already available:
-- Add an email field so staff can receive reset codes directly.
ALTER TABLE staff_cpd
ADD COLUMN IF NOT EXISTS email TEXT;

-- If staff do not have email saved, reset code will be sent to ADMIN_EMAIL.
