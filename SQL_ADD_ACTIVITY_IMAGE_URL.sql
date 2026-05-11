
-- Add poster image support for CPD activities
alter table cpd_activities add column if not exists image_url text;
