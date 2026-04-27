-- Allow recipients to delete messages addressed to them, scoped to their org.
-- Reuses the SECURITY DEFINER helper from 005_fix_user_organization_rls_recursion.sql.
create policy "user_can_delete_own_messages"
  on messages for delete to authenticated
  using (
    to_user_id = auth.uid()
    and org_id = public.get_user_org_id()
  );
