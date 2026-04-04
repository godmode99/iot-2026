#pragma once

#include "app_battery.h"
#include "app_connectivity.h"
#include "app_config.h"
#include "app_sensors.h"
#include "esp_err.h"

esp_err_t app_scheduler_run_bootstrap_cycle(
    const app_config_t *config,
    const app_battery_profile_t *profile,
    app_sensors_t *sensors,
    app_connectivity_t *connectivity
);
