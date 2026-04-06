alter table public.farms
  add column if not exists alert_email_to text,
  add column if not exists alert_line_user_id text;

comment on column public.farms.alert_email_to is 'Farm-scoped email recipient for alert notifications.';
comment on column public.farms.alert_line_user_id is 'Farm-scoped LINE user id for alert notifications.';
