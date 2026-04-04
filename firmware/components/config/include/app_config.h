#pragma once

#include <stdint.h>

typedef struct {
    char device_id[32];
    char serial_number[32];
    char firmware_version[16];
    char battery_variant[16];
    char battery_profile_version[8];
    uint32_t publish_interval_sec;
} app_config_t;

app_config_t app_config_default(void);

