-- Enable delete permission for staff records and related tables.
-- Run this once in Supabase SQL Editor if Delete Staff fails due to RLS.

alter table staff_cpd enable row level security;
drop policy if exists "Allow delete staff records" on staff_cpd;
create policy "Allow delete staff records"
on staff_cpd for delete
using (true);

drop policy if exists "Allow delete notifications" on notifications;
create policy "Allow delete notifications"
on notifications for delete
using (true);

drop policy if exists "Allow delete cpd registrations" on cpd_activity_registrations;
create policy "Allow delete cpd registrations"
on cpd_activity_registrations for delete
using (true);
