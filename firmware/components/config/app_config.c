#include "app_config.h"

#include <string.h>

app_config_t app_config_default(void)
{
    app_config_t config;

    memset(&config, 0, sizeof(config));
    strncpy(config.device_id, "sb00-devkit-01", sizeof(config.device_id) - 1);
    strncpy(config.serial_number, "SB00-BOOTSTRAP", sizeof(config.serial_number) - 1);
    strncpy(config.firmware_version, "0.1.0", sizeof(config.firmware_version) - 1);
    strncpy(config.battery_variant, "standard", sizeof(config.battery_variant) - 1);
    strncpy(config.battery_profile_version, "v1", sizeof(config.battery_profile_version) - 1);
    config.publish_interval_sec = 300;

    return config;
}

