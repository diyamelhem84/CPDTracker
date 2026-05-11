-- The CPD Tracker - Role-Based Security (RLS) Guide
-- IMPORTANT:
-- Full per-user database security requires Supabase Auth users mapped to staff_cpd.username.
-- The current app uses custom username/password in staff_cpd, so UI privacy is enforced in app.js.
-- This SQL prepares RLS-friendly structure and safe policies for authenticated Supabase Auth usage.

-- 1) Ensure useful columns exist
alter table staff_cpd add column if not exists auth_user_id uuid;
alter table notifications add column if not exists staff_id uuid;
alter table notifications add column if not exists username text;
alter table cpd_activity_registrations add column if not exists staff_id uuid;
alter table cpd_activity_registrations add column if not exists username text;

-- 2) Enable RLS
alter table staff_cpd enable row level security;
alter table notifications enable row level security;
alter table cpd_activities enable row level security;
alter table cpd_activity_registrations enable row level security;
alter table app_settings enable row level security;

-- 3) Helper function: current role from staff_cpd mapped to Supabase Auth
create or replace function public.current_cpd_role()
returns text
language sql
security definer
stable
as $$
  select coalesce((select role from public.staff_cpd where auth_user_id = auth.uid() limit 1),'staff');
$$;

create or replace function public.current_cpd_username()
returns text
language sql
security definer
stable
as $$
  select (select username from public.staff_cpd where auth_user_id = auth.uid() limit 1);
$$;

-- 4) Drop old policies safely
drop policy if exists "admin all staff_cpd" on staff_cpd;
drop policy if exists "staff own staff_cpd" on staff_cpd;
drop policy if exists "admin all notifications" on notifications;
drop policy if exists "staff own notifications" on notifications;
drop policy if exists "read active activities" on cpd_activities;
drop policy if exists "admin manage activities" on cpd_activities;
drop policy if exists "admin all registrations" on cpd_activity_registrations;
drop policy if exists "staff own registrations" on cpd_activity_registrations;
drop policy if exists "admin app settings" on app_settings;

-- 5) Staff table policies
create policy "admin all staff_cpd"
on staff_cpd for all
using (public.current_cpd_role() = 'admin')
with check (public.current_cpd_role() = 'admin');

create policy "staff own staff_cpd"
on staff_cpd for select
using (auth_user_id = auth.uid());

create policy "staff update own profile"
on staff_cpd for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid() and role = 'staff');

-- 6) Notifications: admin all, staff own only
create policy "admin all notifications"
on notifications for all
using (public.current_cpd_role() = 'admin')
with check (public.current_cpd_role() = 'admin');

create policy "staff own notifications"
on notifications for select
using (
  staff_id::text = auth.uid()::text
  or lower(username) = lower(public.current_cpd_username())
);

create policy "staff mark own notifications"
on notifications for update
using (
  staff_id::text = auth.uid()::text
  or lower(username) = lower(public.current_cpd_username())
)
with check (
  staff_id::text = auth.uid()::text
  or lower(username) = lower(public.current_cpd_username())
);

-- 7) CPD Activities: all authenticated can read active; admin manages
create policy "read active activities"
on cpd_activities for select
using (status = 'active' or public.current_cpd_role() = 'admin');

create policy "admin manage activities"
on cpd_activities for all
using (public.current_cpd_role() = 'admin')
with check (public.current_cpd_role() = 'admin');

-- 8) Registrations: admin all, staff own only
create policy "admin all registrations"
on cpd_activity_registrations for all
using (public.current_cpd_role() = 'admin')
with check (public.current_cpd_role() = 'admin');

create policy "staff own registrations"
on cpd_activity_registrations for select
using (
  staff_id::text = auth.uid()::text
  or lower(username) = lower(public.current_cpd_username())
);

create policy "staff insert own registrations"
on cpd_activity_registrations for insert
with check (
  staff_id::text = auth.uid()::text
  or lower(username) = lower(public.current_cpd_username())
);

-- 9) Settings: admin only
create policy "admin app settings"
on app_settings for all
using (public.current_cpd_role() = 'admin')
with check (public.current_cpd_role() = 'admin');

-- Reminder:
-- If you are NOT using Supabase Auth yet, do not enable restrictive RLS without testing,
-- because the publishable key will not have auth.uid().
-- The app.js included in this package enforces UI role privacy immediately.
