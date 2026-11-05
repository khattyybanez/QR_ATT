-- QR-ATT role-based navigation, authorized admin reads, and persistent event QR codes.
-- Review in Supabase SQL Editor before applying to production.

-- Extend the existing role constraint. Public signup remains student/teacher only in app code.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));

-- SECURITY DEFINER avoids recursive RLS evaluation when policies need to check admin role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Prevent users from changing their own role through the client API.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Public registration may select student or teacher; only admin is privileged.
  if auth.uid() is not null and new.role = 'admin' and not public.is_admin() then
    raise exception 'Only an authorized administrator may assign the admin role';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update of role on public.profiles
for each row execute function public.prevent_self_role_change();

drop trigger if exists protect_profile_role_insert on public.profiles;
create trigger protect_profile_role_insert
before insert on public.profiles
for each row execute function public.prevent_self_role_change();

-- Replace broad event insert policy so students cannot create events through the API.
drop policy if exists "Users can insert events" on public.events;
create policy "Teachers and admins can insert events" on public.events
for insert with check (
  auth.uid() = created_by
  and (
    public.is_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
  )
);

-- A scan must be submitted by the authenticated student account, not another role.
drop policy if exists "Students can insert their own attendance" on public.attendance;
create policy "Students can insert their own attendance" on public.attendance
for insert with check (
  auth.uid() = student_id
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student')
  and exists (select 1 from public.events e where e.id = attendance.event_id)
);

-- Admin read access across system records.
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
for select using (public.is_admin());

drop policy if exists "Admins can view all events" on public.events;
create policy "Admins can view all events" on public.events
for select using (public.is_admin());

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events" on public.events
for insert with check (public.is_admin());

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events" on public.events
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can view all attendance" on public.attendance;
create policy "Admins can view all attendance" on public.attendance
for select using (public.is_admin());

-- Reuse the existing QR table if it has already been created with this schema.
create table if not exists public.event_qr_codes (
  event_id uuid primary key references public.events(id) on delete cascade,
  payload text not null,
  created_at timestamptz not null default now()
);
alter table public.event_qr_codes enable row level security;

drop policy if exists "Teachers can read QR for own events" on public.event_qr_codes;
create policy "Teachers can read QR for own events" on public.event_qr_codes
for select using (
  exists (select 1 from public.events e where e.id = event_qr_codes.event_id and e.created_by = auth.uid())
);

drop policy if exists "Teachers can save QR for own events" on public.event_qr_codes;
create policy "Teachers can save QR for own events" on public.event_qr_codes
for insert with check (
  exists (select 1 from public.events e where e.id = event_qr_codes.event_id and e.created_by = auth.uid())
);

drop policy if exists "Teachers can update QR for own events" on public.event_qr_codes;
create policy "Teachers can update QR for own events" on public.event_qr_codes
for update using (
  exists (select 1 from public.events e where e.id = event_qr_codes.event_id and e.created_by = auth.uid())
) with check (
  exists (select 1 from public.events e where e.id = event_qr_codes.event_id and e.created_by = auth.uid())
);

drop policy if exists "Admins can view all event QR codes" on public.event_qr_codes;
create policy "Admins can view all event QR codes" on public.event_qr_codes
for select using (public.is_admin());

-- Only an authorized admin should be assigned this role. Run once per trusted admin:
-- update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL';
-- Replace the placeholder with the intended admin email before executing that statement.
