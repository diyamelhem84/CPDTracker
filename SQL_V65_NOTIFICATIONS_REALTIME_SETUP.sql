-- CPD Tracker GOLD V65 - Strong in-site notifications setup
-- Run this once in Supabase SQL Editor before/after deploying V65.
-- Purpose:
-- 1) Keep notifications in Supabase instead of browser cache/localStorage.
-- 2) Support staff receiving notifications when admin adds CPD Activity.
-- 3) Support admin receiving notifications when staff updates My Profile.
-- 4) Enable Realtime delivery with polling fallback in the app.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  recipient_user_id uuid,
  recipient_username text,
  recipient_role text,
  sender_username text,
  staff_id uuid,
  staff_name text,
  username text,
  type text,
  title text,
  message text,
  status text default 'unread',
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists user_id uuid;
alter table public.notifications add column if not exists recipient_user_id uuid;
alter table public.notifications add column if not exists recipient_username text;
alter table public.notifications add column if not exists recipient_role text;
alter table public.notifications add column if not exists sender_username text;
alter table public.notifications add column if not exists staff_id uuid;
alter table public.notifications add column if not exists staff_name text;
alter table public.notifications add column if not exists username text;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists status text default 'unread';
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists created_at timestamptz default now();

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_recipient_user_id on public.notifications(recipient_user_id);
create index if not exists idx_notifications_recipient_username on public.notifications(lower(recipient_username));
create index if not exists idx_notifications_status on public.notifications(status);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- The current CPD Tracker uses custom login, so these permissive anon policies are required for the static Netlify app.
-- Do not enable stricter Supabase Auth RLS unless the app is migrated to Supabase Auth.
alter table public.notifications enable row level security;

drop policy if exists "cpd notifications select" on public.notifications;
drop policy if exists "cpd notifications insert" on public.notifications;
drop policy if exists "cpd notifications update" on public.notifications;
drop policy if exists "cpd notifications delete" on public.notifications;

create policy "cpd notifications select" on public.notifications for select using (true);
create policy "cpd notifications insert" on public.notifications for insert with check (true);
create policy "cpd notifications update" on public.notifications for update using (true) with check (true);
create policy "cpd notifications delete" on public.notifications for delete using (true);

-- Enable Supabase Realtime for notifications.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
