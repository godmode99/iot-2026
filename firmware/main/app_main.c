#include <stdbool.h>
#include <string.h>

#include "app_battery.h"
#include "app_config.h"
#include "app_health.h"
#include "app_logging.h"
#include "app_scheduler.h"
#include "app_sensors.h"
#include "esp_check.h"
#include "esp_log.h"
#include "nvs_flash.h"

static const char *TAG = "sb00_main";

static esp_err_t app_init_nvs(void)
{
    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        err = nvs_flash_init();
    }
    return err;
}

void app_main(void)
{
    esp_err_t err;
    app_config_t config;
    app_config_load_result_t config_result = {0};
    app_battery_profile_t battery_profile = {0};
    app_health_snapshot_t health = {0};
    app_sensors_t sensors = {0};
    bool saved_defaults = false;

    app_log_boot_banner();

    err = app_init_nvs();
    ESP_ERROR_CHECK(err);

    app_health_init();

    err = app_config_load(&config, &config_result);
    ESP_ERROR_CHECK(err);

    app_battery_apply_profile_defaults(&config, &battery_profile);

    if (config_result.status != APP_CONFIG_LOAD_STATUS_LOADED) {
        err = app_config_save(&config);
        if (err == ESP_OK) {
            saved_defaults = true;
        } else {
            ESP_LOGW(TAG, "config_save_failed=%s", esp_err_to_name(err));
        }
    }

    app_health_get_snapshot(&health);
    app_log_config_status(&config_result, saved_defaults);
    app_log_boot_summary(&config, &health, &battery_profile);
    err = app_sensors_init(&sensors);
    ESP_ERROR_CHECK(err);
    app_log_sensor_status(&sensors);

    err = app_scheduler_run_bootstrap_cycle(&config, &battery_profile, &sensors);
    ESP_ERROR_CHECK(err);

    ESP_LOGI(TAG, "bootstrap_cycle_complete");
}
