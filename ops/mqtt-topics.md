# MQTT Topic Baseline

Baseline prefix:

- `sb00/devices`

Initial topic plan:

- telemetry uplink: `sb00/devices/{device_id}/telemetry`
- status uplink: `sb00/devices/{device_id}/status`
- command downlink placeholder: `sb00/devices/{device_id}/commands`

Notes:

- topic names are explicit but still provisional
- `EX-05` and `EX-07` should keep these names aligned across firmware and backend

