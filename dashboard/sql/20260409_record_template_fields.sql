create table if not exists public.record_template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.record_templates(id) on delete cascade,
  field_key text not null,
  field_type text not null,
  label text not null,
  unit text null,
  placeholder text null,
  sort_order integer not null default 0,
  is_required boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint record_template_fields_type_check check (field_type in ('number', 'text', 'boolean'))
);

create unique index if not exists record_template_fields_template_key_idx
  on public.record_template_fields (template_id, field_key);

insert into public.record_template_fields (template_id, field_key, field_type, label, unit, placeholder, sort_order, is_required)
select template.id, seeded.field_key, seeded.field_type, seeded.label, seeded.unit, seeded.placeholder, seeded.sort_order, seeded.is_required
from public.record_templates template
join (
  values
    ('daily_operations', 'checklist_completed', 'boolean', 'Checklist completed', null, null, 10, false),
    ('daily_operations', 'observation_note', 'text', 'Observation note', null, 'Stock active, feeding normal, no visible issue.', 20, false),
    ('water_quality_round', 'water_temperature_c', 'number', 'Water temperature', 'C', '28.4', 10, false),
    ('water_quality_round', 'salinity_ppt', 'number', 'Salinity', 'ppt', '25', 20, false),
    ('water_quality_round', 'dissolved_oxygen_mg_l', 'number', 'Dissolved oxygen', 'mg/L', '5.8', 30, false),
    ('water_quality_round', 'observation_note', 'text', 'Observation note', null, 'Stock active, feeding normal, no visible issue.', 40, false),
    ('hatchery_observation', 'dissolved_oxygen_mg_l', 'number', 'Dissolved oxygen', 'mg/L', '5.8', 10, false),
    ('hatchery_observation', 'checklist_completed', 'boolean', 'Checklist completed', null, null, 20, false),
    ('hatchery_observation', 'observation_note', 'text', 'Observation note', null, 'Stock active, feeding normal, no visible issue.', 30, false)
) as seeded(template_code, field_key, field_type, label, unit, placeholder, sort_order, is_required)
  on seeded.template_code = template.code
on conflict (template_id, field_key) do update
set
  field_type = excluded.field_type,
  label = excluded.label,
  unit = excluded.unit,
  placeholder = excluded.placeholder,
  sort_order = excluded.sort_order,
  is_required = excluded.is_required,
  is_active = true;
