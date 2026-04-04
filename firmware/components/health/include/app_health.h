#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "esp_system.h"

typedef struct {
    uint32_t uptime_ms;
    esp_reset_reason_t reset_reason;
    bool watchdog_enabled;
    const char *fault_marker;
} app_health_snapshot_t;

void app_health_init(void);
void app_health_get_snapshot(app_health_snapshot_t *snapshot);
const char *app_health_reset_reason_string(esp_reset_reason_t reason);
