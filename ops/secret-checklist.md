# Secret Checklist

| secret_name | used_by | owner | local_required | production_required | notes |
| --- | --- | --- | --- | --- | --- |
| `SUPABASE_URL` | backend, dashboard | Pon | yes | yes | project URL |
| `SUPABASE_ANON_KEY` | dashboard | Pon | yes | yes | public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Pon | optional | yes | server-side only |
| `SUPABASE_DB_URL` | backend, ops | Pon | optional | yes | used for migrations or direct SQL workflows |
| `MQTT_BROKER_URL` | firmware, backend | Pon | optional | yes | broker host with TLS |
| `MQTT_USERNAME` | firmware, backend | Pon | optional | yes | broker auth |
| `MQTT_PASSWORD` | firmware, backend | Pon | optional | yes | broker auth |
| `LINE_CHANNEL_ACCESS_TOKEN` | backend | Pon | optional | yes | pilot notification path |
| `RESEND_API_KEY` | backend | Pon | optional | yes | email notification path |
| `JWT_SECRET` | backend | Pon | yes | yes | server-side only |
| `OTA_SIGNING_KEY_PATH` | firmware release tooling | Pon | optional | yes | keep out of repo |
| `NEXT_PUBLIC_MAP_API_KEY` | dashboard | Pon | optional | optional | only needed when real maps are enabled |

