-- V31 CPD Activity improvements
alter table cpd_activities add column if not exists multiple_dates text;
alter table cpd_activities add column if not exists points_text text;

update cpd_activities
set points_text = coalesce(points_text, points::text)
where points_text is null;
