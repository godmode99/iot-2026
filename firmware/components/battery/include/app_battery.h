#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "app_config.h"

typedef struct {
    const char *battery_variant;
    const char *battery_profile_version;
    uint32_t usable_capacity_mah;
    uint32_t default_interval_sec;
    uint32_t night_interval_sec;
    uint8_t low_battery_warn_pct;
    uint8_t low_battery_critical_pct;
} app_battery_profile_t;

bool app_battery_profile_get(const char *battery_variant, app_battery_profile_t *profile);
bool app_battery_apply_profile_defaults(app_config_t *config, app_battery_profile_t *profile);
