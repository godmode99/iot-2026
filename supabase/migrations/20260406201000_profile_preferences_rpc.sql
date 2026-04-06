create or replace function public.update_own_profile(
  target_display_name text,
  target_preferred_locale text
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.user_profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if target_preferred_locale not in ('th', 'en', 'my') then
    raise exception 'invalid_locale' using errcode = '22023';
  end if;

  insert into public.user_profiles (
    user_id,
    user_type,
    display_name,
    preferred_locale
  ) values (
    (select auth.uid()),
    'customer',
    nullif(btrim(target_display_name), ''),
    target_preferred_locale
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    preferred_locale = excluded.preferred_locale
  returning * into updated_profile;

  return updated_profile;
end;
$$;

grant execute on function public.update_own_profile(text, text) to authenticated;
