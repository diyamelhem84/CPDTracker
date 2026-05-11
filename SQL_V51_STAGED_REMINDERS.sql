-- CPD Tracker V51 Smart Staged Reminders
-- Run this once in Supabase SQL Editor.

ALTER TABLE staff_cpd
ADD COLUMN IF NOT EXISTS last_reminder_stage TEXT;

ALTER TABLE staff_cpd
ADD COLUMN IF NOT EXISTS last_email_sent DATE;

-- Optional: clear old stage values if you want to restart reminders from today.
-- UPDATE staff_cpd SET last_reminder_stage = NULL, last_email_sent = NULL;
