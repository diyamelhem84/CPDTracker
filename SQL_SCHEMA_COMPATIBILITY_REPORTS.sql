-- Schema compatibility for The CPD Tracker reports
-- Your project uses category1_points and category23_points.
-- This file is optional; the updated code now reads/writes these columns directly.

alter table staff_cpd add column if not exists category1_points numeric default 0;
alter table staff_cpd add column if not exists category23_points numeric default 0;

-- Optional sync if you previously created category1/category23:
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='staff_cpd' and column_name='category1') then
    update staff_cpd set category1_points = coalesce(category1_points, category1, 0);
  end if;
  if exists (select 1 from information_schema.columns where table_name='staff_cpd' and column_name='category23') then
    update staff_cpd set category23_points = coalesce(category23_points, category23, 0);
  end if;
end $$;
