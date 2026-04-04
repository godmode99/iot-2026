#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#include "esp_err.h"

#define APP_CONFIG_VERSION 2U

typedef struct {
    uint32_t config_version;
    char device_id[32];
    char serial_number[32];
    char firmware_version[16];
    char battery_variant[16];
    char battery_profile_version[8];
    uint32_t usable_capacity_mah;
    uint32_t publish_interval_sec;
    uint32_t night_interval_sec;
    char mqtt_topic_prefix[64];
    char mqtt_broker_uri[96];
} app_config_t;

typedef enum {
    APP_CONFIG_LOAD_STATUS_LOADED = 0,
    APP_CONFIG_LOAD_STATUS_DEFAULTED,
    APP_CONFIG_LOAD_STATUS_RECOVERED
} app_config_load_status_t;

typedef struct {
    app_config_load_status_t status;
    esp_err_t storage_result;
} app_config_load_result_t;

app_config_t app_config_default(void);
bool app_config_validate(const app_config_t *config, char *reason, size_t reason_len);
esp_err_t app_config_load(app_config_t *config, app_config_load_result_t *result);
esp_err_t app_config_save(const app_config_t *config);
