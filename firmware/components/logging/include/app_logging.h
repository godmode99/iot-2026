#pragma once

#include <stdbool.h>

#include "app_battery.h"
#include "app_config.h"
#include "app_health.h"
#include "app_sensors.h"
#include "app_telemetry.h"

void app_log_boot_banner(void);
void app_log_config_status(const app_config_load_result_t *result, bool saved_defaults);
void app_log_boot_summary(
    const app_config_t *config,
    const app_health_snapshot_t *health,
    const app_battery_profile_t *profile
);
void app_log_sensor_status(const app_sensors_t *sensors);
void app_log_scheduler_phase(const char *phase);
void app_log_telemetry_sample(const app_telemetry_t *telemetry);
