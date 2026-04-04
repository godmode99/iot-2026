#pragma once

#include <stdint.h>

#include "app_battery.h"
#include "app_config.h"
#include "app_health.h"

typedef struct {
    uint32_t recorded_at_unix;
    float temperature_c;
    int32_t turbidity_raw;
    float battery_percent;
    uint32_t battery_mv;
    double lat;
    double lng;
    uint8_t signal_quality;
    const char *gps_fix_state;
} app_telemetry_t;

void app_telemetry_make_placeholder(
    const app_config_t *config,
    const app_battery_profile_t *profile,
    const app_health_snapshot_t *health,
    app_telemetry_t *telemetry
);
