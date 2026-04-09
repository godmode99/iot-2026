create table if not exists public.record_template_farm_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.record_templates(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (template_id, farm_id)
);

create index if not exists record_template_farm_assignments_template_idx
  on public.record_template_farm_assignments (template_id);

create index if not exists record_template_farm_assignments_farm_idx
  on public.record_template_farm_assignments (farm_id);
