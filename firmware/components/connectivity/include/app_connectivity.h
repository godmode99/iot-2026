#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "app_config.h"
#include "app_telemetry.h"
#include "esp_err.h"

#define APP_CONNECTIVITY_MAX_BUFFERED 4
#define APP_CONNECTIVITY_TOPIC_MAX_LEN 128
#define APP_CONNECTIVITY_PAYLOAD_MAX_LEN 512

typedef struct {
    bool occupied;
    uint8_t qos;
    uint32_t recorded_at_unix;
    char topic[APP_CONNECTIVITY_TOPIC_MAX_LEN];
    char payload[APP_CONNECTIVITY_PAYLOAD_MAX_LEN];
} app_connectivity_buffer_entry_t;

typedef struct {
    bool initialized;
    bool mock_mode;
    bool modem_ready;
    bool network_attached;
    bool time_synced;
    bool mqtt_connected;
    bool force_buffer_once;
    uint32_t publish_attempts;
    uint32_t successful_publishes;
    uint32_t buffered_count;
    char telemetry_topic[APP_CONNECTIVITY_TOPIC_MAX_LEN];
    char status_topic[APP_CONNECTIVITY_TOPIC_MAX_LEN];
    char command_topic[APP_CONNECTIVITY_TOPIC_MAX_LEN];
    app_connectivity_buffer_entry_t buffer[APP_CONNECTIVITY_MAX_BUFFERED];
} app_connectivity_t;

esp_err_t app_connectivity_init(const app_config_t *config, app_connectivity_t *connectivity);
esp_err_t app_connectivity_publish_telemetry(
    app_connectivity_t *connectivity,
    const app_config_t *config,
    const app_telemetry_t *telemetry
);
