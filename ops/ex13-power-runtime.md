# EX-13 Power And Runtime Runbook

## Purpose

Use this runbook to capture bench current measurements and convert them into runtime estimates for the locked battery targets.

## Inputs Required

- boot phase current and duration
- sensor-read phase current and duration
- network attach phase current and duration
- publish phase current and duration
- sleep current
- optional reconnect penalty per day
- optional reboot penalty per day

## Measurement Flow

1. instrument the board with the current-measurement tool
2. capture one normal publish cycle
3. split the cycle into `boot`, `sensor`, `network_attach`, `publish`, `sleep`
4. update [ex13-measurement-template.json](C:/Users/iidogpon/Documents/GitHub/iot-2026/ops/ex13-measurement-template.json) with measured values
5. run the estimator script

## Command

```powershell
pnpm power:estimate -- --input ops/ex13-measurement-template.json --out-dir artifacts/ex13
```

## Expected Outputs

- `artifacts/ex13/runtime-estimate.json`
- `artifacts/ex13/runtime-estimate.md`

## Required Review Questions

- Does `standard @ 5 min` meet `>= 12 days`?
- Does `long_life @ 5 min` meet `>= 30 days`?
- Does `long_life @ 10 min` meet `>= 60 days`?
- Which phase dominates energy use?
- Is reconnect penalty material?

## Gap Categories

- `meets target`
- `near target with optimization required`
- `misses target materially`
