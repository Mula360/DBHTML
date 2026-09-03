-- ============================================================================
-- Fix: documents DELETE is Secretary/President only (Prompt 11), not the
-- creator. Add/edit stays open to any member.
-- ============================================================================

drop policy if exists documents_delete on documents;

create policy documents_delete on documents for delete to authenticated
  using (is_officer());
