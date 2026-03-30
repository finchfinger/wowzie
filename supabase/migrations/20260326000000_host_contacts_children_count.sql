-- Add children_count to host_contacts so hosts can track how many
-- children a family has enrolled across their activities.
alter table host_contacts
  add column if not exists children_count integer not null default 0;
