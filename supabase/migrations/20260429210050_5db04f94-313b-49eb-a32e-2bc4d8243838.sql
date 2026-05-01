-- Set search_path on remaining function
create or replace function public.update_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- Revoke EXECUTE from anon and authenticated on SECURITY DEFINER funcs
revoke execute on function public.has_role(uuid, public.user_role) from anon, authenticated, public;
revoke execute on function public.current_user_role() from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.update_updated_at() from anon, authenticated, public;