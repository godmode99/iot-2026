#include "app_config.h"

#include <inttypes.h>
#include <stdio.h>
#include <string.h>

#include "nvs.h"
#include "nvs_flash.h"

static const char *APP_CONFIG_NAMESPACE = "appcfg";
static const char *APP_CONFIG_KEY = "blob";

static bool app_config_text_has_value(const char *value)
{
    return value != NULL && value[0] != '\0';
}

app_config_t app_config_default(void)
{
    app_config_t config;

    memset(&config, 0, sizeof(config));
    config.config_version = APP_CONFIG_VERSION;
    strncpy(config.device_id, "sb00-devkit-01", sizeof(config.device_id) - 1);
    strncpy(config.serial_number, "SB00-BOOTSTRAP", sizeof(config.serial_number) - 1);
    strncpy(config.firmware_version, "0.1.0", sizeof(config.firmware_version) - 1);
    strncpy(config.battery_variant, "standard", sizeof(config.battery_variant) - 1);
    strncpy(config.battery_profile_version, "v1", sizeof(config.battery_profile_version) - 1);
    strncpy(config.mqtt_topic_prefix, "sb00/devices", sizeof(config.mqtt_topic_prefix) - 1);
    config.usable_capacity_mah = 5600;
    config.publish_interval_sec = 300;
    config.night_interval_sec = 900;

    return config;
}

bool app_config_validate(const app_config_t *config, char *reason, size_t reason_len)
{
    if (config == NULL) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "config is null");
        }
        return false;
    }

    if (config->config_version != APP_CONFIG_VERSION) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "unsupported config_version=%" PRIu32, config->config_version);
        }
        return false;
    }

    if (!app_config_text_has_value(config->device_id)) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "device_id missing");
        }
        return false;
    }

    if (!app_config_text_has_value(config->serial_number)) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "serial_number missing");
        }
        return false;
    }

    if (!app_config_text_has_value(config->firmware_version)) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "firmware_version missing");
        }
        return false;
    }

    if (!app_config_text_has_value(config->battery_variant)) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "battery_variant missing");
        }
        return false;
    }

    if (!app_config_text_has_value(config->battery_profile_version)) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "battery_profile_version missing");
        }
        return false;
    }

    if (!app_config_text_has_value(config->mqtt_topic_prefix)) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "mqtt_topic_prefix missing");
        }
        return false;
    }

    if (config->publish_interval_sec < 60 || config->publish_interval_sec > 86400) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "publish_interval_sec out of range");
        }
        return false;
    }

    if (config->night_interval_sec < config->publish_interval_sec) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "night_interval_sec must be >= publish_interval_sec");
        }
        return false;
    }

    if (config->usable_capacity_mah == 0) {
        if (reason != NULL && reason_len > 0) {
            snprintf(reason, reason_len, "usable_capacity_mah missing");
        }
        return false;
    }

    if (reason != NULL && reason_len > 0) {
        reason[0] = '\0';
    }

    return true;
}

esp_err_t app_config_load(app_config_t *config, app_config_load_result_t *result)
{
    esp_err_t err;
    nvs_handle_t handle;
    size_t required_size = sizeof(*config);
    app_config_t loaded = {0};
    char reason[96];

    if (config == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    if (result != NULL) {
        result->status = APP_CONFIG_LOAD_STATUS_DEFAULTED;
        result->storage_result = ESP_OK;
    }

    err = nvs_open(APP_CONFIG_NAMESPACE, NVS_READWRITE, &handle);
    if (err != ESP_OK) {
        *config = app_config_default();
        if (result != NULL) {
            result->status = APP_CONFIG_LOAD_STATUS_DEFAULTED;
            result->storage_result = err;
        }
        return ESP_OK;
    }

    err = nvs_get_blob(handle, APP_CONFIG_KEY, &loaded, &required_size);
    if (err == ESP_ERR_NVS_NOT_FOUND || required_size != sizeof(loaded)) {
        *config = app_config_default();
        if (result != NULL) {
            result->status = APP_CONFIG_LOAD_STATUS_DEFAULTED;
            result->storage_result = err;
        }
        nvs_close(handle);
        return ESP_OK;
    }

    if (err != ESP_OK || !app_config_validate(&loaded, reason, sizeof(reason))) {
        *config = app_config_default();
        if (result != NULL) {
            result->status = APP_CONFIG_LOAD_STATUS_RECOVERED;
            result->storage_result = (err == ESP_OK) ? ESP_ERR_INVALID_RESPONSE : err;
        }
        nvs_close(handle);
        return ESP_OK;
    }

    *config = loaded;
    if (result != NULL) {
        result->status = APP_CONFIG_LOAD_STATUS_LOADED;
        result->storage_result = ESP_OK;
    }

    nvs_close(handle);
    return ESP_OK;
}

esp_err_t app_config_save(const app_config_t *config)
{
    esp_err_t err;
    nvs_handle_t handle;
    char reason[96];

    if (config == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    if (!app_config_validate(config, reason, sizeof(reason))) {
        return ESP_ERR_INVALID_ARG;
    }

    err = nvs_open(APP_CONFIG_NAMESPACE, NVS_READWRITE, &handle);
    if (err != ESP_OK) {
        return err;
    }

    err = nvs_set_blob(handle, APP_CONFIG_KEY, config, sizeof(*config));
    if (err == ESP_OK) {
        err = nvs_commit(handle);
    }

    nvs_close(handle);
    return err;
}
