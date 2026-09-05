-- Larder: switching households.
-- Joining moves you: any other membership you hold is ended, and a household left with
-- no members is removed. leave_household() does the same without joining a new one.

create or replace function join_household(p_code text, p_member_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into h from household where invite_code = lower(trim(p_code));
  if h is null then raise exception 'no household with that invite code'; end if;

  update member set deleted = true where auth_user_id = auth.uid() and household_id <> h and not deleted;
  delete from household hh
    where hh.id <> h
      and not exists (select 1 from member m where m.household_id = hh.id and not m.deleted);

  if exists (select 1 from member where household_id = h and auth_user_id = auth.uid() and not deleted) then return h; end if;
  update member set deleted = false, name = p_member_name where household_id = h and auth_user_id = auth.uid();
  if not found then
    insert into member(household_id, auth_user_id, name) values (h, auth.uid(), p_member_name);
  end if;
  return h;
end $$;

create or replace function leave_household()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update member set deleted = true where auth_user_id = auth.uid() and not deleted;
  delete from household hh
    where not exists (select 1 from member m where m.household_id = hh.id and not m.deleted);
end $$;

revoke all on function leave_household() from public, anon;
grant execute on function leave_household() to authenticated;
