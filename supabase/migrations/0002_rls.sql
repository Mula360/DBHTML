-- ============================================================================
-- Row Level Security — Deccan Birders EC Portal
-- Every table gets RLS enabled. Helpers resolve the caller's current-term
-- position. "authenticated" here always means "a linked EC member" because the
-- auth callback refuses to create a session for any email not in members.
-- ============================================================================

-- ---- Helpers -------------------------------------------------------------
create or replace function auth_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from members where auth_id = auth.uid()
$$;

-- Current-term position for the calling member (end_date is null = active).
create or replace function get_my_position()
returns text language sql stable security definer set search_path = public as $$
  select mp.position
  from member_positions mp
  join terms t on t.id = mp.term_id and t.is_current
  where mp.member_id = auth_member_id()
    and mp.end_date is null
  order by mp.start_date desc
  limit 1
$$;

create or replace function has_position(variadic positions text[])
returns boolean language sql stable security definer set search_path = public as $$
  select get_my_position() = any(positions)
$$;

create or replace function is_officer()
returns boolean language sql stable as $$
  select has_position('President', 'Secretary')
$$;

-- Members allowed to touch the general membership register.
create or replace function can_manage_register()
returns boolean language sql stable as $$
  select has_position('VP-1', 'VP-2', 'EC2', 'Treasurer', 'Secretary', 'President')
$$;

-- ---- Enable RLS on every table -----------------------------------------
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- ---- terms / positions / portfolios -----------------------------------
create policy terms_read on terms for select to authenticated using (true);
create policy terms_write on terms for all to authenticated
  using (is_officer()) with check (is_officer());

create policy members_read on members for select to authenticated using (true);
create policy members_update_self on members for update to authenticated
  using (id = auth_member_id()) with check (id = auth_member_id());
-- Note: column-level restriction (phone/photo/ebird only) is enforced in the
-- app layer / an update RPC; a plain member can only reach their own row here.
create policy members_admin on members for all to authenticated
  using (is_officer()) with check (is_officer());

create policy positions_read on member_positions for select to authenticated using (true);
create policy positions_write on member_positions for all to authenticated
  using (is_officer()) with check (is_officer());

create policy portfolios_read on portfolio_assignments for select to authenticated using (true);
create policy portfolios_write on portfolio_assignments for all to authenticated
  using (is_officer()) with check (is_officer());

-- ---- compliance config ----------------------------------------------------
create policy cconfig_read on compliance_config for select to authenticated using (true);
create policy cconfig_update on compliance_config for update to authenticated
  using (is_officer()) with check (is_officer());
create policy cconfig_audit_read on compliance_config_audit for select to authenticated using (true);
create policy cconfig_audit_insert on compliance_config_audit for insert to authenticated
  with check (is_officer());

-- ---- shared club-record tables --------------------------------------------
-- SELECT/INSERT/UPDATE for any member; DELETE for creator or officer.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'meetings','moms','walks','events','portfolio_updates','pitta_issues',
    'hba_seasons','awc_sites','documents'
  ]
  loop
    execute format('create policy %1$s_read on %1$s for select to authenticated using (true)', tbl);
    execute format('create policy %1$s_insert on %1$s for insert to authenticated with check (true)', tbl);
    execute format('create policy %1$s_update on %1$s for update to authenticated using (true) with check (true)', tbl);
  end loop;
end $$;

-- DELETE: creator or officer where a created_by column exists.
create policy meetings_delete on meetings for delete to authenticated
  using (created_by = auth_member_id() or is_officer());
create policy walks_delete on walks for delete to authenticated
  using (created_by = auth_member_id() or is_officer());
create policy portfolio_updates_delete on portfolio_updates for delete to authenticated
  using (created_by = auth_member_id() or is_officer());
create policy documents_delete on documents for delete to authenticated
  using (added_by = auth_member_id() or is_officer());
-- Tables without a creator column: officer only.
create policy moms_delete on moms for delete to authenticated using (is_officer());
create policy events_delete on events for delete to authenticated using (is_officer());
create policy pitta_issues_delete on pitta_issues for delete to authenticated using (is_officer());
create policy hba_seasons_delete on hba_seasons for delete to authenticated using (is_officer());
create policy awc_sites_delete on awc_sites for delete to authenticated using (is_officer());

-- ---- action items -------------------------------------------------------
create policy action_items_read on action_items for select to authenticated using (true);
create policy action_items_insert on action_items for insert to authenticated with check (true);
create policy action_items_update on action_items for update to authenticated
  using (assigned_to = auth_member_id() or created_by = auth_member_id() or is_officer())
  with check (assigned_to = auth_member_id() or created_by = auth_member_id() or is_officer());
create policy action_items_delete on action_items for delete to authenticated using (is_officer());

create policy action_comments_read on action_comments for select to authenticated using (true);
create policy action_comments_insert on action_comments for insert to authenticated
  with check (member_id = auth_member_id());
create policy action_comments_delete on action_comments for delete to authenticated
  using (member_id = auth_member_id() or is_officer());

-- ---- attendance / helper join tables ------------------------------------
-- own rows + Secretary any
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'meeting_attendance','walk_attendance','walk_coordinators','event_helpers'
  ]
  loop
    execute format('create policy %1$s_read on %1$s for select to authenticated using (true)', tbl);
    execute format($f$create policy %1$s_write on %1$s for all to authenticated
      using (member_id = auth_member_id() or has_position('Secretary','President'))
      with check (member_id = auth_member_id() or has_position('Secretary','President'))$f$, tbl);
  end loop;
end $$;

-- ---- expense claims ----------------------------------------------------
create policy claims_read on expense_claims for select to authenticated
  using (member_id = auth_member_id() or has_position('Treasurer','President','Secretary'));
create policy claims_insert on expense_claims for insert to authenticated
  with check (member_id = auth_member_id());
create policy claims_update on expense_claims for update to authenticated
  using (has_position('Treasurer')) with check (has_position('Treasurer'));

-- ---- society (general) members register --------------------------------
create policy society_members_all on society_members for all to authenticated
  using (can_manage_register()) with check (can_manage_register());

-- ---- statutory items / AGM checklists ---------------------------------
create policy statutory_read on statutory_items for select to authenticated using (true);
create policy statutory_write on statutory_items for all to authenticated
  using (has_position('Secretary','President','Treasurer'))
  with check (has_position('Secretary','President','Treasurer'));

create policy agm_read on agm_checklists for select to authenticated using (true);
create policy agm_write on agm_checklists for all to authenticated
  using (has_position('Secretary','President','Treasurer'))
  with check (has_position('Secretary','President','Treasurer'));

create policy pitta_contrib_read on pitta_contributions for select to authenticated using (true);
create policy pitta_contrib_write on pitta_contributions for all to authenticated
  using (has_position('VP-1','Secretary','President'))
  with check (has_position('VP-1','Secretary','President'));

-- ---- notifications -----------------------------------------------------
create policy notifications_own on notifications for select to authenticated
  using (member_id = auth_member_id());
create policy notifications_update_own on notifications for update to authenticated
  using (member_id = auth_member_id()) with check (member_id = auth_member_id());

create policy digest_log_read on digest_log for select to authenticated using (is_officer());
