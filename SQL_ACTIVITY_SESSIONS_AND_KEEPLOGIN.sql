-- V35 Multiple sessions save fix
alter table cpd_activities add column if not exists event_mode text default 'single';
alter table cpd_activities add column if not exists sessions_json text;
alter table cpd_activities add column if not exists start_time text;
alter table cpd_activities add column if not exists end_time text;
alter table cpd_activities add column if not exists multiple_dates text;
alter table cpd_activities add column if not exists points_text text;

update cpd_activities
set points_text = coalesce(points_text, points::text)
where points_text is null;
