#include "app_battery.h"

#include <string.h>

static const app_battery_profile_t STANDARD_PROFILE = {
    .battery_variant = "standard",
    .battery_profile_version = "v1",
    .usable_capacity_mah = 5600,
    .default_interval_sec = 300,
    .night_interval_sec = 900,
    .low_battery_warn_pct = 15,
    .low_battery_critical_pct = 10
};

static const app_battery_profile_t LONG_LIFE_PROFILE = {
    .battery_variant = "long_life",
    .battery_profile_version = "v1",
    .usable_capacity_mah = 23200,
    .default_interval_sec = 300,
    .night_interval_sec = 1800,
    .low_battery_warn_pct = 20,
    .low_battery_critical_pct = 10
};

bool app_battery_profile_get(const char *battery_variant, app_battery_profile_t *profile)
{
    if (profile == NULL) {
        return false;
    }

    if (battery_variant != NULL && strcmp(battery_variant, LONG_LIFE_PROFILE.battery_variant) == 0) {
        *profile = LONG_LIFE_PROFILE;
        return true;
    }

    *profile = STANDARD_PROFILE;
    return battery_variant != NULL && strcmp(battery_variant, STANDARD_PROFILE.battery_variant) == 0;
}

bool app_battery_apply_profile_defaults(app_config_t *config, app_battery_profile_t *profile)
{
    app_battery_profile_t resolved;

    if (config == NULL) {
        return false;
    }

    app_battery_profile_get(config->battery_variant, &resolved);
    strncpy(config->battery_variant, resolved.battery_variant, sizeof(config->battery_variant) - 1);
    config->battery_variant[sizeof(config->battery_variant) - 1] = '\0';
    strncpy(
        config->battery_profile_version,
        resolved.battery_profile_version,
        sizeof(config->battery_profile_version) - 1
    );
    config->battery_profile_version[sizeof(config->battery_profile_version) - 1] = '\0';

    if (config->usable_capacity_mah == 0) {
        config->usable_capacity_mah = resolved.usable_capacity_mah;
    }

    if (config->publish_interval_sec == 0) {
        config->publish_interval_sec = resolved.default_interval_sec;
    }

    if (config->night_interval_sec == 0) {
        config->night_interval_sec = resolved.night_interval_sec;
    }

    if (profile != NULL) {
        *profile = resolved;
    }

    return true;
}
