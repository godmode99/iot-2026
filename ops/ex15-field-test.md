# EX-15 Field Test Runbook

## Purpose

Use this runbook to execute the first 7-day engineering field test and leave behind a short report with pass or fail conclusions.

## Before Deployment

- confirm the device is provisioned through the QR + Web/PWA flow
- confirm dashboard telemetry is visible before site departure
- note the battery variant and interval profile
- capture the deployment start timestamp

## During Deployment

Record daily:

- telemetry continuity
- online or offline behavior
- battery trend
- alert usefulness or noise
- GPS anomalies
- sensor drift or suspicious values

## Observation File

Update [ex15-observation-template.json](C:/Users/iidogpon/Documents/GitHub/iot-2026/ops/ex15-observation-template.json) during or after the run.

## Report Command

```powershell
pnpm field:report -- --input ops/ex15-observation-template.json --out-dir artifacts/ex15
```

## Expected Outputs

- `artifacts/ex15/field-report.json`
- `artifacts/ex15/field-report.md`

## Minimum Evidence

- setup summary
- 7 daily checkpoints
- observed issues
- pass or fail conclusion
- recommended next actions
