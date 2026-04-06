create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references public.farms (id) on delete cascade,
  device_id uuid references public.devices (id) on delete cascade,
  alert_id uuid references public.alerts (id) on delete cascade,
  channel text not null
    check (channel in ('stub', 'email', 'line')),
  event_type text not null,
  delivery_status text not null
    check (delivery_status in ('queued', 'sent', 'failed', 'skipped')),
  recipient text,
  payload_json jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_notification_log_created_at_desc
  on public.notification_log (created_at desc);

create index idx_notification_log_alert_id
  on public.notification_log (alert_id);

alter table public.notification_log enable row level security;

create policy notification_log_select_owned_farms
  on public.notification_log
  for select
  to authenticated
  using (
    farm_id is not null
    and public.user_owns_farm(farm_id)
  );

comment on table public.notification_log is 'Alert and ops notification delivery audit log.';
