-- Add last login tracking for The CPD Tracker
alter table staff_cpd add column if not exists last_login timestamptz;
