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
    ESP_LOGI(TAG, "SB-00 firmware sensor bootstrap ready for EX-04");
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

void app_log_sensor_status(const app_sensors_t *sensors)
{
    if (sensors == NULL) {
        return;
    }

    ESP_LOGI(
        TAG,
        "sensor_status ds18b20=%s turbidity=%s max17048=%s l76k=%s",
        app_sensor_driver_status_label(&sensors->ds18b20),
        app_sensor_driver_status_label(&sensors->turbidity_adc),
        app_sensor_driver_status_label(&sensors->max17048),
        app_sensor_driver_status_label(&sensors->l76k)
    );
}

void app_log_telemetry_sample(const app_telemetry_t *telemetry)
{
    char temp_text[24] = "na";
    char turbidity_text[24] = "na";
    char battery_percent_text[24] = "na";
    char battery_mv_text[24] = "na";
    char signal_text[24] = "na";
    char lat_text[24] = "na";
    char lng_text[24] = "na";

    if (telemetry == NULL) {
        return;
    }

    if (telemetry->has_temperature_c) {
        snprintf(temp_text, sizeof(temp_text), "%.2f", telemetry->temperature_c);
    }
    if (telemetry->has_turbidity_raw) {
        snprintf(turbidity_text, sizeof(turbidity_text), "%" PRIi32, telemetry->turbidity_raw);
    }
    if (telemetry->has_battery_percent) {
        snprintf(battery_percent_text, sizeof(battery_percent_text), "%.2f", telemetry->battery_percent);
    }
    if (telemetry->has_battery_mv) {
        snprintf(battery_mv_text, sizeof(battery_mv_text), "%" PRIu32, telemetry->battery_mv);
    }
    if (telemetry->has_signal_quality) {
        snprintf(signal_text, sizeof(signal_text), "%u", telemetry->signal_quality);
    }
    if (telemetry->has_location) {
        snprintf(lat_text, sizeof(lat_text), "%.6f", telemetry->lat);
        snprintf(lng_text, sizeof(lng_text), "%.6f", telemetry->lng);
    }

    ESP_LOGI(
        TAG,
        "telemetry_sample ts=%" PRIu32 " temp=%s turbidity=%s battery_pct=%s battery_mv=%s signal=%s gps_fix=%s lat=%s lng=%s",
        telemetry->recorded_at_unix,
        temp_text,
        turbidity_text,
        battery_percent_text,
        battery_mv_text,
        signal_text,
        telemetry->gps_fix_state,
        lat_text,
        lng_text
    );
}
