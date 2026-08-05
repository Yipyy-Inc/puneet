-- ============================================================================
-- A trainer is a member of staff.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- `trainers` in src/data/training.ts: four invented people with their own ids
-- ("trainer-001"), their own emails at yipyy.com, and no connection to anybody
-- employed. Meanwhile `staff` has two real trainers at this facility — Marcus
-- Bélanger and Noémie Fortin.
--
-- So the instructor picker on the series editor offered four people who do not
-- work here and omitted the two who do. Somebody assigned to a class could not
-- be paid for it, rostered, or messaged.
--
-- ── OPTIONAL ENRICHMENT, NOT A GATE ───────────────────────────────────────
--
-- `grooming_stylist_profiles` (20260806500000) takes the opposite line: a
-- groomer with no grooming profile is NOT a stylist and is absent from the
-- picker, because `Stylist` promises a skill level and a daily capacity and
-- inventing those would put a fabricated groomer into an assignment decision.
--
-- Nothing on a trainer profile is load-bearing like that. Specialisations, a
-- bio and a certification list are things a customer reads, not things a
-- scheduler reasons about. So the LIST comes from `staff` — anyone whose role
-- is trainer — and this table only decorates it. A trainer nobody has written
-- a bio for is still a trainer, and still assignable.
--
-- The consequence is that this migration seeds nothing. There is no row here
-- until somebody fills one in, and the two real trainers show up regardless.
-- ============================================================================

create table if not exists public.training_trainer_profiles (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references public.facilities(id) on delete cascade,
  -- One profile per staff member. ON DELETE CASCADE: the profile is about the
  -- person, and means nothing once they are gone.
  staff_id          uuid not null references public.staff(id) on delete cascade,
  specializations   text[] not null default '{}',
  certifications    text[] not null default '{}',
  years_experience  integer check (years_experience is null or years_experience >= 0),
  bio               text not null default '',
  -- Shown to customers on the class listing. Off by default: a bio nobody has
  -- reviewed should not appear on a public page because a row was created.
  visible_online    boolean not null default false,
  calendar_color    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (staff_id)
);

comment on table public.training_trainer_profiles is
  'Optional enrichment for a staff member who trains — specialisations, a bio, '
  'certifications. The list of trainers comes from staff.primary_role, not '
  'from here: a trainer with no profile is still a trainer.';

create or replace function private.touch_trainer_profile()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trainer_profiles_set_updated_at on public.training_trainer_profiles;
create trigger trainer_profiles_set_updated_at
  before update on public.training_trainer_profiles
  for each row execute function private.touch_trainer_profile();

alter table public.training_trainer_profiles enable row level security;

-- Readable by anyone who can see the staff list — this is roster information,
-- and the screens that show a class show its instructor.
drop policy if exists trainer_profiles_read on public.training_trainer_profiles;
create policy trainer_profiles_read
  on public.training_trainer_profiles for select
  using (private.has_permission(facility_id, 'view_team_schedule')
         or private.has_permission(facility_id, 'view_staff'));

-- Writing one is managing the training programme, which is the trainer's and
-- the manager's job — not the front desk's.
drop policy if exists trainer_profiles_write on public.training_trainer_profiles;
create policy trainer_profiles_write
  on public.training_trainer_profiles for all
  using (private.has_permission(facility_id, 'training_manage_programs'))
  with check (private.has_permission(facility_id, 'training_manage_programs'));

revoke all on public.training_trainer_profiles from public;
grant select, insert, update, delete on public.training_trainer_profiles to authenticated;
