#include "app_logging.h"

#include <inttypes.h>

#include "esp_log.h"

static const char *TAG = "sb00_bootstrap";

static const char *app_config_status_label(app_config_load_status_t status)
{
    switch (status) {
    case APP_CONFIG_LOAD_STATUS_LOADED:
        return "loaded_from_nvs";
    case APP_CONFIG_LOAD_STATUS_DEFAULTED:
        return "defaulted";
    case APP_CONFIG_LOAD_STATUS_RECOVERED:
        return "recovered_to_defaults";
    default:
        return "unknown";
    }
}

void app_log_boot_banner(void)
{
    ESP_LOGI(TAG, "SB-00 firmware skeleton ready for EX-03");
}

void app_log_config_status(const app_config_load_result_t *result, bool saved_defaults)
{
    if (result == NULL) {
        ESP_LOGW(TAG, "config status unavailable");
        return;
    }

    ESP_LOGI(
        TAG,
        "config_status=%s storage_result=%s saved_defaults=%s",
        app_config_status_label(result->status),
        esp_err_to_name(result->storage_result),
        saved_defaults ? "true" : "false"
    );
}

void app_log_boot_summary(
    const app_config_t *config,
    const app_health_snapshot_t *health,
    const app_battery_profile_t *profile
)
{
    if (config == NULL || health == NULL || profile == NULL) {
        ESP_LOGW(TAG, "boot summary incomplete");
        return;
    }

    ESP_LOGI(TAG, "app_name=sb00_bootstrap");
    ESP_LOGI(TAG, "firmware_version=%s", config->firmware_version);
    ESP_LOGI(TAG, "device_id=%s", config->device_id);
    ESP_LOGI(TAG, "serial_number=%s", config->serial_number);
    ESP_LOGI(TAG, "reset_reason=%s", app_health_reset_reason_string(health->reset_reason));
    ESP_LOGI(TAG, "battery_variant=%s", profile->battery_variant);
    ESP_LOGI(TAG, "battery_profile_version=%s", profile->battery_profile_version);
    ESP_LOGI(TAG, "usable_capacity_mah=%" PRIu32, profile->usable_capacity_mah);
    ESP_LOGI(TAG, "publish_interval_sec=%" PRIu32, config->publish_interval_sec);
    ESP_LOGI(TAG, "night_interval_sec=%" PRIu32, config->night_interval_sec);
    ESP_LOGI(TAG, "mqtt_topic_prefix=%s", config->mqtt_topic_prefix);
}

void app_log_scheduler_phase(const char *phase)
{
    ESP_LOGI(TAG, "scheduler_phase=%s", phase);
}

void app_log_telemetry_placeholder(const app_telemetry_t *telemetry)
{
    if (telemetry == NULL) {
        return;
    }

    ESP_LOGI(
        TAG,
        "telemetry_sample ts=%" PRIu32 " temp=%.2f turbidity=%" PRIi32 " battery_pct=%.2f battery_mv=%" PRIu32
        " signal=%u gps_fix=%s lat=%.6f lng=%.6f",
        telemetry->recorded_at_unix,
        telemetry->temperature_c,
        telemetry->turbidity_raw,
        telemetry->battery_percent,
        telemetry->battery_mv,
        telemetry->signal_quality,
        telemetry->gps_fix_state,
        telemetry->lat,
        telemetry->lng
    );
}
