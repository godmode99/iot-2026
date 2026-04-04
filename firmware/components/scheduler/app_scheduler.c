#include "app_scheduler.h"

#include <inttypes.h>

#include "app_health.h"
#include "app_logging.h"
#include "app_sensors.h"
#include "app_telemetry.h"
#include "esp_check.h"
#include "esp_log.h"
#include "esp_task_wdt.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "sb00_scheduler";
static bool s_task_registered = false;

static void app_scheduler_feed_watchdog(void)
{
    esp_err_t err;

    if (!s_task_registered) {
        err = esp_task_wdt_add(NULL);
        if (err == ESP_OK) {
            s_task_registered = true;
        } else {
            ESP_LOGW(TAG, "watchdog_register_failed=%s", esp_err_to_name(err));
            return;
        }
    }

    err = esp_task_wdt_reset();
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "watchdog_feed_failed=%s", esp_err_to_name(err));
    }
}

esp_err_t app_scheduler_run_bootstrap_cycle(
    const app_config_t *config,
    const app_battery_profile_t *profile,
    app_sensors_t *sensors
)
{
    app_health_snapshot_t health = {0};
    app_sensor_sample_t sample = {0};
    app_telemetry_t telemetry = {0};

    if (config == NULL || profile == NULL || sensors == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    app_scheduler_feed_watchdog();
    app_log_scheduler_phase("read");
    app_health_get_snapshot(&health);
    ESP_RETURN_ON_ERROR(app_sensors_read(sensors, &sample), TAG, "sensor_read_failed");
    app_telemetry_from_sensor_sample(config, profile, &health, &sample, &telemetry);
    vTaskDelay(pdMS_TO_TICKS(10));

    app_scheduler_feed_watchdog();
    app_log_scheduler_phase("publish_sample");
    app_log_telemetry_sample(&telemetry);
    vTaskDelay(pdMS_TO_TICKS(10));

    app_scheduler_feed_watchdog();
    app_log_scheduler_phase("sleep_plan");
    ESP_LOGI(TAG, "next_cycle_delay_ms=%" PRIu32, config->publish_interval_sec * 1000U);

    return ESP_OK;
}
