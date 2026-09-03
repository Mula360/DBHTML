-- ============================================================================
-- Performance: one round-trip helpers for the app shell.
-- ============================================================================

-- Member row + current-term position in one call (replaces a members select
-- plus the get_my_position() RPC on every page).
create or replace function app_session()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'member', to_jsonb(m),
    'position', (
      select mp.position
      from member_positions mp
      join terms t on t.id = mp.term_id and t.is_current
      where mp.member_id = m.id and mp.end_date is null
      order by mp.start_date desc
      limit 1
    )
  )
  from members m
  where m.auth_id = auth.uid() and m.is_active
  limit 1
$$;

-- All the sidebar / bell badge counts in one call.
create or replace function nav_badges()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select id from members where auth_id = auth.uid())
  select jsonb_build_object(
    'unread',   (select count(*) from notifications n, me where n.member_id = me.id and n.read_at is null),
    'actions',  (select count(*) from action_items a, me where a.assigned_to = me.id and a.status in ('Open','InProgress')),
    'meetings', (select count(*) from meetings where date >= current_date),
    'walks',    (select count(*) from walks where date >= current_date),
    'pitta',    (select count(*) from pitta_issues where status <> 'Published'),
    'claims',   (select count(*) from expense_claims where status = 'Pending')
  )
$$;

grant execute on function app_session() to authenticated, service_role;
grant execute on function nav_badges() to authenticated, service_role;
