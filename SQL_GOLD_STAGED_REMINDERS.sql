ALTER TABLE staff_cpd ADD COLUMN IF NOT EXISTS last_reminder_stage TEXT;
ALTER TABLE staff_cpd ADD COLUMN IF NOT EXISTS last_email_sent DATE;
