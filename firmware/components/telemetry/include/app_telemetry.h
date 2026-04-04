#pragma once

#include <stdint.h>
#include <stdbool.h>

#include "app_battery.h"
#include "app_config.h"
#include "app_health.h"
#include "app_sensors.h"

typedef struct {
    uint32_t recorded_at_unix;
    bool has_temperature_c;
    float temperature_c;
    bool has_turbidity_raw;
    int32_t turbidity_raw;
    bool has_battery_percent;
    float battery_percent;
    bool has_battery_mv;
    uint32_t battery_mv;
    bool has_location;
    double lat;
    double lng;
    bool has_signal_quality;
    uint8_t signal_quality;
    char gps_fix_state[16];
} app_telemetry_t;

void app_telemetry_from_sensor_sample(
    const app_config_t *config,
    const app_battery_profile_t *profile,
    const app_health_snapshot_t *health,
    const app_sensor_sample_t *sample,
    app_telemetry_t *telemetry
);
