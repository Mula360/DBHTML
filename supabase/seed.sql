-- ============================================================================
-- Seed data — Deccan Birders EC Portal
-- Run automatically by `supabase db reset`. Safe to re-run (idempotent-ish:
-- it clears and re-inserts the seeded rows).
--
-- EDIT the members array below with the real 10 EC members before going live.
-- Position slots, in order: President, VP-1, VP-2, Secretary, Treasurer,
--                           EC1, EC2, EC3, EC4, EC5
-- ============================================================================

begin;

-- wipe seeded config/structure (leave transactional data alone in real use)
delete from portfolio_assignments;
delete from compliance_config;
delete from member_positions;
delete from members where email like '%@example.com';
delete from terms;

-- ---- Term --------------------------------------------------------------
insert into terms (id, label, start_date, end_date, is_current) values
  ('11111111-1111-1111-1111-111111111111', '2026-28', '2026-09-01', '2028-08-31', true);

-- ---- Compliance config (defaults per schema) -------------------------
insert into compliance_config (term_id) values
  ('11111111-1111-1111-1111-111111111111');

-- ---- Members + current-term positions --------------------------------
do $$
declare
  term uuid := '11111111-1111-1111-1111-111111111111';
  slots text[] := array['President','VP-1','VP-2','Secretary','Treasurer',
                        'EC1','EC2','EC3','EC4','EC5'];
  -- EDIT THESE: {name, email}
  names text[] := array[
    'Member One','Member Two','Member Three','Srikanth Bhamidipati','Member Five',
    'Member Six','Member Seven','Member Eight','Member Nine','Member Ten'];
  emails text[] := array[
    'member1@example.com','member2@example.com','member3@example.com',
    'srikanth@deccanbirders.org','member5@example.com','member6@example.com',
    'member7@example.com','member8@example.com','member9@example.com',
    'member10@example.com'];
  i int;
  mid uuid;
begin
  for i in 1..10 loop
    insert into members (name, email, is_active, joined_at)
      values (names[i], emails[i], true, '2026-09-01')
      returning id into mid;
    insert into member_positions (member_id, term_id, position, start_date)
      values (mid, term, slots[i], '2026-09-01');
  end loop;
end $$;

-- ---- Portfolio assignments (11) --------------------------------------
insert into portfolio_assignments (term_id, portfolio_name, lead_member_id, support_member_ids)
select '11111111-1111-1111-1111-111111111111', p.name,
       (select member_id from member_positions where position = p.lead
          and term_id = '11111111-1111-1111-1111-111111111111'),
       coalesce((select array_agg(member_id) from member_positions
          where position = any(p.support)
            and term_id = '11111111-1111-1111-1111-111111111111'), '{}')
from (values
  ('Website',           'Secretary', array['EC1']),
  ('MemberEngagement',  'VP-1',      array['EC2']),
  ('FDCoordination',    'President',  array['EC3']),
  ('BirdRace',          'VP-2',      array['EC4']),
  ('AnnualDinner',      'VP-1',      array['EC5']),
  ('AGM',               'Secretary', array['EC1']),
  ('AWC',               'VP-2',      array['EC2']),
  ('HBA',               'Secretary', array['EC3','EC4']),
  ('IndianRoller',      'VP-1',      array['EC5']),
  ('Pitta',             'VP-1',      array['EC2']),
  ('NewProject',        'President',  array['EC4'])
) as p(name, lead, support);

commit;
