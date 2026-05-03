
drop policy "auth write alerts" on public.alerts;
create policy "dispatcher write alerts" on public.alerts for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher') or public.has_role(auth.uid(),'maintenance'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'dispatcher') or public.has_role(auth.uid(),'maintenance'));

revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
