grant execute on function public.has_role(uuid, public.user_role) to anon, authenticated;
grant execute on function public.current_user_role() to anon, authenticated;