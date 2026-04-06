# Production Readiness Checklist

## Purpose

This checklist tracks the gap between the current pre-production stack and a real production launch.

## Software

- [ ] Dashboard Vercel project uses `dashboard/` as the project root.
- [ ] `pnpm deploy:check -- --env .env.production.local --target production` passes.
- [ ] `INGEST_SHARED_TOKEN` is set outside local development.
- [ ] `ADMIN_API_TOKEN` is set outside local development.
- [ ] `ADMIN_ALLOW_INSECURE_DEV=false` outside local development.
- [ ] `PROVISIONING_ALLOW_INSECURE_DEV=false` outside local development.
- [ ] `DASHBOARD_ALLOW_ACTOR_OVERRIDE=false` outside local debugging.
- [ ] Supabase Auth redirect URLs include `/auth/callback` and `/reset-password`.
- [ ] Supabase Auth custom SMTP is configured before customer-facing email flows.
- [ ] Alert notification contacts are set per farm.
- [ ] `notification_log` is reviewed during alert tests.
- [ ] OTA manifest entries use real artifact URLs and checksums.
- [ ] Command fetch and ack flow is verified with a physical device.

## Hardware Validation

- [ ] DS18B20 backend is implemented and tested on hardware.
- [ ] GPS behavior is verified on hardware.
- [ ] MAX17048 readings are verified on hardware.
- [ ] Turbidity ADC calibration path is confirmed.
- [ ] 4G attach and MQTT/TLS publish are tested on hardware.
- [ ] Battery runtime is measured using the EX-13 template.
- [ ] Bench soak is run with physical hardware.
- [ ] Field test evidence is captured using the EX-15 template.

## Operations

- [ ] Incident response playbook is reviewed by the team.
- [ ] Support flow is reviewed by the team.
- [ ] Escalation owner is named for firmware, hardware, and backend.
- [ ] Customer-facing support template is approved.
- [ ] QR/provisioning procedure is rehearsed end-to-end.
- [ ] Factory/service upgrade procedure is documented for battery modules.

## Security

- [ ] Secrets are stored outside git and rotated from local defaults.
- [ ] Admin APIs are not exposed without auth.
- [ ] Device ingest uses shared token or stronger device credentials.
- [ ] RLS policies are reviewed against the production auth model.
- [ ] OTA signing and rollback criteria are finalized before rollout.

## Launch Gate

Production launch should not proceed until:

- Physical device validation is complete.
- At least one full soak run passes on hardware.
- At least one field deployment report is reviewed.
- Support and incident flows have named owners.
- Security defaults are disabled for production.
