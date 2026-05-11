-- CPD Activities Module Tables
create extension if not exists pgcrypto;

create table if not exists cpd_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  provider text,
  activity_type text,
  event_date date,
  duration_hours numeric default 0,
  points numeric default 0,
  category text,
  fee_type text default 'Free',
  fee_amount text,
  location text,
  registration_link text,
  description text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists cpd_activity_registrations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references cpd_activities(id) on delete cascade,
  staff_id uuid,
  staff_name text,
  username text,
  status text default 'registered',
  registered_at timestamptz default now()
);

alter table cpd_activities enable row level security;
alter table cpd_activity_registrations enable row level security;

drop policy if exists "Public read cpd activities" on cpd_activities;
create policy "Public read cpd activities" on cpd_activities for select using (true);

drop policy if exists "Public insert cpd activities" on cpd_activities;
create policy "Public insert cpd activities" on cpd_activities for insert with check (true);

drop policy if exists "Public update cpd activities" on cpd_activities;
create policy "Public update cpd activities" on cpd_activities for update using (true);

drop policy if exists "Public read cpd registrations" on cpd_activity_registrations;
create policy "Public read cpd registrations" on cpd_activity_registrations for select using (true);

drop policy if exists "Public insert cpd registrations" on cpd_activity_registrations;
create policy "Public insert cpd registrations" on cpd_activity_registrations for insert with check (true);

insert into cpd_activities (title,provider,activity_type,event_date,duration_hours,points,category,fee_type,fee_amount,location,registration_link,description)
values
('Infection Control Update Workshop','West Bay Medicare','Workshop', current_date + interval '14 days', 2, 2, 'Category 1', 'Free', '', 'Doha, Qatar', '', 'Focused update on IPC practices and compliance.'),
('Patient Safety & Risk Management Webinar','Online CPD Provider','Webinar', current_date + interval '25 days', 1.5, 1.5, 'Category 2&3', 'Free', '', 'Online', '', 'Webinar covering patient safety essentials and risk reduction.'),
('Healthcare Quality Improvement Seminar','Quality Education Center','Seminar', current_date + interval '35 days', 3, 3, 'Category 1', 'Paid', 'QAR 100', 'Doha, Qatar', '', 'Practical seminar on KPIs, audits, and improvement projects.')
on conflict do nothing;

-- Add poster image support for CPD activities
alter table cpd_activities add column if not exists image_url text;
