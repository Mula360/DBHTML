-- ============================================================================
-- Perf: single-query summaries for hot pages (nano compute contends badly on
-- multiple concurrent COUNT()s).
-- ============================================================================

create or replace function society_member_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'active',   count(*) filter (where status = 'Active'),
    'due',      count(*) filter (where status = 'Due'),
    'lapsed',   count(*) filter (where status = 'Lapsed'),
    'life',     count(*) filter (where status = 'Life'),
    'total',    count(*),
    'due_soon', count(*) filter (
                  where status in ('Due','Lapsed')
                    and renewal_due_date is not null
                    and renewal_due_date <= current_date + 30
                )
  )
  from society_members
  where is_deleted = false
$$;

grant execute on function society_member_summary() to authenticated, service_role;

-- Indexes that matter once the register + activity tables carry real volume.
create index if not exists society_members_status_idx
  on society_members (status) where is_deleted = false;
create index if not exists society_members_name_idx
  on society_members (name) where is_deleted = false;
create index if not exists meeting_attendance_member_status_idx
  on meeting_attendance (member_id, status);
create index if not exists action_items_assignee_status_idx
  on action_items (assigned_to, status);
create index if not exists notifications_member_unread_idx
  on notifications (member_id) where read_at is null;
