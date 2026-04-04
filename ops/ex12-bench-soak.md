# EX-12 Bench Soak Runbook

## Purpose

This file defines the first bench-soak workflow for local simulation and later real hardware runs.

## Simulation Mode

Use this before hardware is available:

```powershell
pnpm db:reset
$env:NODE_ENV='development'
$env:APP_URL='http://localhost:3000'
$env:BACKEND_URL='http://localhost:3100'
$env:SUPABASE_URL='http://127.0.0.1:54321'
$env:SUPABASE_ANON_KEY='dev-anon'
$env:SUPABASE_SERVICE_ROLE_KEY='dev-service'
$env:SUPABASE_DB_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
$env:MQTT_BROKER_URL='mqtts://broker.placeholder.local:8883'
$env:MQTT_USERNAME='demo'
$env:MQTT_PASSWORD='demo'
$env:MQTT_TOPIC_PREFIX='sb00/devices'
$env:JWT_SECRET='dev-secret'
pnpm bench:soak -- --device-id sb00-devkit-01 --duration-minutes 3 --interval-seconds 2
```

Expected outputs:

- `artifacts/ex12/<timestamp-device>/events.ndjson`
- `artifacts/ex12/<timestamp-device>/summary.json`
- `artifacts/ex12/<timestamp-device>/summary.md`

## Real Bench Run Later

When hardware is available, collect:

- firmware serial logs
- backend ingest logs
- reconnect or outage note timestamps
- reboot or power-cycle timestamps
- final pass or fail notes

## Minimum Evidence Checklist

- start timestamp
- end timestamp
- successful publish count
- buffered payload count
- flushed payload count
- reconnect event observed
- offline evaluation observed
- reboot or restart recovery observed
- final alert state reviewed
