#pragma once

#include "app_battery.h"
#include "app_config.h"
#include "esp_err.h"

esp_err_t app_scheduler_run_bootstrap_cycle(
    const app_config_t *config,
    const app_battery_profile_t *profile
);
