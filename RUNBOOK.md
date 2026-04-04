# EX-01 Runbook

This repository now contains the first runnable workspace for:

- `firmware/` - ESP-IDF skeleton for `ESP32-S3`
- `backend/` - local API and ingest placeholder
- `dashboard/` - local dashboard placeholder
- `shared/` - contracts and baseline schemas
- `ops/` - environment, secrets, and topic notes

## Prerequisites

- `Node.js`
- `pnpm`
- `ESP-IDF v5.4.3`

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in real secrets when available
3. For placeholder local boot, defaults will still allow backend and dashboard to start

## Backend

Run:

```powershell
pnpm --dir backend dev
```

Health check:

```powershell
Invoke-WebRequest http://localhost:3100/health
```

## Dashboard

Run:

```powershell
pnpm --dir dashboard dev
```

Open:

```text
http://localhost:3000
```

## Run Both Web Apps

Run:

```powershell
pnpm dev
```

## Firmware

Build:

```powershell
pnpm build:firmware
```

This helper script pins the working `ESP-IDF v5.4.3` tool paths for this machine and produces:

- `firmware/build/sb00_bootstrap.bin`
- `firmware/build/bootloader/bootloader.bin`

The firmware app prints a bootstrap banner and boot summary.

## Database

Start the local Supabase stack:

```powershell
pnpm db:start
```

Apply migrations locally:

```powershell
pnpm db:reset
```

Lint schema SQL:

```powershell
pnpm db:lint
```

## Workspace Outputs

`EX-01` currently provides:

- stable `.env.example`
- starter shared contracts
- secret checklist
- MQTT topic baseline
- local Supabase workflow and first migration path
- bootable backend and dashboard placeholders
- buildable firmware skeleton

## Next Tasks Unlocked

- `EX-03` firmware skeleton expansion
- `EX-06` schema and migrations
- `EX-09` dashboard MVP
