#include "app_health.h"

#include "esp_timer.h"

static int64_t s_boot_time_us = 0;

void app_health_init(void)
{
    s_boot_time_us = esp_timer_get_time();
}

void app_health_get_snapshot(app_health_snapshot_t *snapshot)
{
    if (snapshot == NULL) {
        return;
    }

    snapshot->uptime_ms = (uint32_t)((esp_timer_get_time() - s_boot_time_us) / 1000);
    snapshot->reset_reason = esp_reset_reason();
    snapshot->watchdog_enabled = true;
    snapshot->fault_marker = "none";
}

const char *app_health_reset_reason_string(esp_reset_reason_t reason)
{
    switch (reason) {
    case ESP_RST_POWERON:
        return "power_on";
    case ESP_RST_EXT:
        return "external";
    case ESP_RST_SW:
        return "software";
    case ESP_RST_PANIC:
        return "panic";
    case ESP_RST_INT_WDT:
        return "interrupt_watchdog";
    case ESP_RST_TASK_WDT:
        return "task_watchdog";
    case ESP_RST_WDT:
        return "other_watchdog";
    case ESP_RST_DEEPSLEEP:
        return "deep_sleep";
    case ESP_RST_BROWNOUT:
        return "brownout";
    case ESP_RST_SDIO:
        return "sdio";
    default:
        return "unknown";
    }
}
