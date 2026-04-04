#include "app_logging.h"

#include <inttypes.h>

#include "esp_log.h"

static const char *TAG = "sb00_bootstrap";

void app_log_boot_banner(void)
{
    ESP_LOGI(TAG, "SB-00 firmware bootstrap ready");
}

void app_log_boot_summary(const app_config_t *config)
{
    ESP_LOGI(TAG, "device_id=%s", config->device_id);
    ESP_LOGI(TAG, "serial_number=%s", config->serial_number);
    ESP_LOGI(TAG, "firmware_version=%s", config->firmware_version);
    ESP_LOGI(TAG, "battery_variant=%s", config->battery_variant);
    ESP_LOGI(TAG, "publish_interval_sec=%" PRIu32, config->publish_interval_sec);
}
