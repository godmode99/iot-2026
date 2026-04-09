create table if not exists public.record_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  code text not null unique,
  name text not null,
  description text null,
  scope_type text not null default 'farm',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.operational_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  farm_id uuid not null references public.farms(id) on delete cascade,
  hatchery_id uuid null,
  template_id uuid not null references public.record_templates(id),
  record_status text not null default 'submitted',
  recorded_for_date date not null,
  created_by uuid not null,
  submitted_at timestamptz null,
  notes_summary text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operational_records_status_check check (record_status in ('draft', 'submitted'))
);

create table if not exists public.record_entries (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.operational_records(id) on delete cascade,
  field_key text not null,
  field_type text not null,
  label text not null,
  value_text text null,
  value_number numeric null,
  value_boolean boolean null,
  value_json jsonb null,
  unit text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists operational_records_farm_created_at_idx
  on public.operational_records (farm_id, created_at desc);

create index if not exists operational_records_template_idx
  on public.operational_records (template_id, recorded_for_date desc);

create index if not exists record_entries_record_sort_idx
  on public.record_entries (record_id, sort_order asc);

insert into public.record_templates (code, name, description, scope_type)
values
  ('daily_operations', 'Daily Operations', 'Capture daily hatchery or farm work in one structured record.', 'farm'),
  ('water_quality_round', 'Water Quality Round', 'Record water parameters, observations, and immediate follow-up notes.', 'farm'),
  ('hatchery_observation', 'Hatchery Observation', 'Track stock condition, behavior, and operational observations.', 'farm')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  scope_type = excluded.scope_type,
  is_active = true;
