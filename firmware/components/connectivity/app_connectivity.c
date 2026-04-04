#include "app_connectivity.h"

#include <inttypes.h>
#include <stdio.h>
#include <string.h>

#include "esp_check.h"
#include "esp_log.h"
#include "esp_timer.h"

static const char *TAG = "sb00_connectivity";
static const char *APP_CONNECTIVITY_TIMESTAMP_SOURCE = "boot_offset";

static uint32_t app_connectivity_normalize_timestamp(uint32_t recorded_at_unix)
{
    if (recorded_at_unix >= 1700000000U) {
        return recorded_at_unix;
    }

    return 1735689600U + recorded_at_unix;
}

static void app_connectivity_build_topics(const app_config_t *config, app_connectivity_t *connectivity)
{
    snprintf(
        connectivity->telemetry_topic,
        sizeof(connectivity->telemetry_topic),
        "%s/%s/telemetry",
        config->mqtt_topic_prefix,
        config->device_id
    );
    snprintf(
        connectivity->status_topic,
        sizeof(connectivity->status_topic),
        "%s/%s/status",
        config->mqtt_topic_prefix,
        config->device_id
    );
    snprintf(
        connectivity->command_topic,
        sizeof(connectivity->command_topic),
        "%s/%s/command",
        config->mqtt_topic_prefix,
        config->device_id
    );
}

static void app_connectivity_float_field(char *buffer, size_t len, bool available, float value)
{
    if (!available) {
        snprintf(buffer, len, "null");
        return;
    }

    snprintf(buffer, len, "%.2f", value);
}

static void app_connectivity_int_field(char *buffer, size_t len, bool available, int32_t value)
{
    if (!available) {
        snprintf(buffer, len, "null");
        return;
    }

    snprintf(buffer, len, "%" PRIi32, value);
}

static void app_connectivity_uint_field(char *buffer, size_t len, bool available, uint32_t value)
{
    if (!available) {
        snprintf(buffer, len, "null");
        return;
    }

    snprintf(buffer, len, "%" PRIu32, value);
}

static void app_connectivity_double_field(char *buffer, size_t len, bool available, double value)
{
    if (!available) {
        snprintf(buffer, len, "null");
        return;
    }

    snprintf(buffer, len, "%.6f", value);
}

static esp_err_t app_connectivity_serialize_telemetry(
    const app_config_t *config,
    const app_telemetry_t *telemetry,
    char *payload,
    size_t payload_len
)
{
    char temperature_c[32];
    char turbidity_raw[32];
    char battery_percent[32];
    char battery_mv[32];
    char lat[32];
    char lng[32];
    char signal_quality[32];
    uint32_t normalized_timestamp;
    int written;

    if (config == NULL || telemetry == NULL || payload == NULL || payload_len == 0U) {
        return ESP_ERR_INVALID_ARG;
    }

    normalized_timestamp = app_connectivity_normalize_timestamp(telemetry->recorded_at_unix);
    app_connectivity_float_field(temperature_c, sizeof(temperature_c), telemetry->has_temperature_c, telemetry->temperature_c);
    app_connectivity_int_field(turbidity_raw, sizeof(turbidity_raw), telemetry->has_turbidity_raw, telemetry->turbidity_raw);
    app_connectivity_float_field(battery_percent, sizeof(battery_percent), telemetry->has_battery_percent, telemetry->battery_percent);
    app_connectivity_uint_field(battery_mv, sizeof(battery_mv), telemetry->has_battery_mv, telemetry->battery_mv);
    app_connectivity_double_field(lat, sizeof(lat), telemetry->has_location, telemetry->lat);
    app_connectivity_double_field(lng, sizeof(lng), telemetry->has_location, telemetry->lng);
    app_connectivity_uint_field(signal_quality, sizeof(signal_quality), telemetry->has_signal_quality, telemetry->signal_quality);

    written = snprintf(
        payload,
        payload_len,
        "{"
        "\"device_id\":\"%s\","
        "\"timestamp\":%" PRIu32 ","
        "\"timestamp_source\":\"%s\","
        "\"temperature_c\":%s,"
        "\"turbidity_raw\":%s,"
        "\"battery_percent\":%s,"
        "\"battery_mv\":%s,"
        "\"lat\":%s,"
        "\"lng\":%s,"
        "\"firmware_version\":\"%s\","
        "\"signal_quality\":%s,"
        "\"gps_fix_state\":\"%s\","
        "\"battery_variant\":\"%s\""
        "}",
        config->device_id,
        normalized_timestamp,
        APP_CONNECTIVITY_TIMESTAMP_SOURCE,
        temperature_c,
        turbidity_raw,
        battery_percent,
        battery_mv,
        lat,
        lng,
        config->firmware_version,
        signal_quality,
        telemetry->gps_fix_state,
        config->battery_variant
    );
    if (written < 0 || (size_t)written >= payload_len) {
        return ESP_ERR_NO_MEM;
    }

    return ESP_OK;
}

static esp_err_t app_connectivity_buffer_push(
    app_connectivity_t *connectivity,
    const char *topic,
    const char *payload,
    uint32_t recorded_at_unix
)
{
    size_t index;
    app_connectivity_buffer_entry_t *entry = NULL;

    for (index = 0; index < APP_CONNECTIVITY_MAX_BUFFERED; ++index) {
        if (!connectivity->buffer[index].occupied) {
            entry = &connectivity->buffer[index];
            break;
        }
    }

    if (entry == NULL) {
        return ESP_ERR_NO_MEM;
    }

    memset(entry, 0, sizeof(*entry));
    entry->occupied = true;
    entry->qos = 1;
    entry->recorded_at_unix = recorded_at_unix;
    snprintf(entry->topic, sizeof(entry->topic), "%s", topic);
    snprintf(entry->payload, sizeof(entry->payload), "%s", payload);
    connectivity->buffered_count += 1U;

    ESP_LOGW(
        TAG,
        "buffer_enqueue topic=%s qos=%u buffered_count=%" PRIu32,
        entry->topic,
        entry->qos,
        connectivity->buffered_count
    );
    return ESP_OK;
}

static esp_err_t app_connectivity_mock_modem_init(app_connectivity_t *connectivity, const app_config_t *config)
{
    if (connectivity->modem_ready) {
        return ESP_OK;
    }

    connectivity->modem_ready = true;
    ESP_LOGI(TAG, "modem_init mode=mock serial=%s", config->serial_number);
    return ESP_OK;
}

static esp_err_t app_connectivity_mock_attach_network(app_connectivity_t *connectivity)
{
    if (connectivity->network_attached) {
        return ESP_OK;
    }

    connectivity->network_attached = true;
    ESP_LOGI(TAG, "network_attach mode=mock registration=home signal_quality=18");
    return ESP_OK;
}

static esp_err_t app_connectivity_mock_time_sync(app_connectivity_t *connectivity)
{
    if (connectivity->time_synced) {
        return ESP_OK;
    }

    connectivity->time_synced = true;
    ESP_LOGI(TAG, "time_sync mode=mock source=network baseline_ticks=%" PRIu64, (uint64_t)esp_timer_get_time());
    return ESP_OK;
}

static esp_err_t app_connectivity_mock_mqtt_connect(app_connectivity_t *connectivity, const app_config_t *config)
{
    if (connectivity->mqtt_connected) {
        return ESP_OK;
    }

    connectivity->mqtt_connected = true;
    ESP_LOGI(
        TAG,
        "mqtt_connect mode=mock broker=%s tls=true qos=1 telemetry_topic=%s status_topic=%s command_topic=%s",
        config->mqtt_broker_uri,
        connectivity->telemetry_topic,
        connectivity->status_topic,
        connectivity->command_topic
    );
    return ESP_OK;
}

static void app_connectivity_mock_disconnect(app_connectivity_t *connectivity, const char *reason)
{
    connectivity->mqtt_connected = false;
    ESP_LOGW(TAG, "mqtt_disconnect mode=mock reason=%s", reason);
}

static esp_err_t app_connectivity_flush_buffer(app_connectivity_t *connectivity)
{
    size_t index;

    if (!connectivity->mqtt_connected) {
        return ESP_ERR_INVALID_STATE;
    }

    for (index = 0; index < APP_CONNECTIVITY_MAX_BUFFERED; ++index) {
        app_connectivity_buffer_entry_t *entry = &connectivity->buffer[index];
        if (!entry->occupied) {
            continue;
        }

        ESP_LOGI(
            TAG,
            "buffer_flush topic=%s qos=%u original_ts=%" PRIu32,
            entry->topic,
            entry->qos,
            entry->recorded_at_unix
        );
        memset(entry, 0, sizeof(*entry));
        if (connectivity->buffered_count > 0U) {
            connectivity->buffered_count -= 1U;
        }
    }

    return ESP_OK;
}

esp_err_t app_connectivity_init(const app_config_t *config, app_connectivity_t *connectivity)
{
    if (config == NULL || connectivity == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    memset(connectivity, 0, sizeof(*connectivity));
    connectivity->initialized = true;
    connectivity->mock_mode = true;
    connectivity->force_buffer_once = true;
    app_connectivity_build_topics(config, connectivity);

    ESP_LOGI(
        TAG,
        "connectivity_ready mode=mock broker=%s telemetry_topic=%s status_topic=%s command_topic=%s",
        config->mqtt_broker_uri,
        connectivity->telemetry_topic,
        connectivity->status_topic,
        connectivity->command_topic
    );
    return ESP_OK;
}

esp_err_t app_connectivity_publish_telemetry(
    app_connectivity_t *connectivity,
    const app_config_t *config,
    const app_telemetry_t *telemetry
)
{
    char payload[APP_CONNECTIVITY_PAYLOAD_MAX_LEN];

    if (connectivity == NULL || config == NULL || telemetry == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    ESP_RETURN_ON_ERROR(app_connectivity_mock_modem_init(connectivity, config), TAG, "modem_init_failed");
    ESP_RETURN_ON_ERROR(app_connectivity_mock_attach_network(connectivity), TAG, "network_attach_failed");
    ESP_RETURN_ON_ERROR(app_connectivity_mock_time_sync(connectivity), TAG, "time_sync_failed");
    ESP_RETURN_ON_ERROR(app_connectivity_mock_mqtt_connect(connectivity, config), TAG, "mqtt_connect_failed");
    ESP_RETURN_ON_ERROR(
        app_connectivity_serialize_telemetry(config, telemetry, payload, sizeof(payload)),
        TAG,
        "payload_serialize_failed"
    );

    connectivity->publish_attempts += 1U;

    if (connectivity->force_buffer_once) {
        connectivity->force_buffer_once = false;
        app_connectivity_mock_disconnect(connectivity, "mock_link_drop_once");
        ESP_RETURN_ON_ERROR(
            app_connectivity_buffer_push(connectivity, connectivity->telemetry_topic, payload, telemetry->recorded_at_unix),
            TAG,
            "buffer_enqueue_failed"
        );
        ESP_RETURN_ON_ERROR(app_connectivity_mock_mqtt_connect(connectivity, config), TAG, "mqtt_reconnect_failed");
        ESP_LOGI(TAG, "mqtt_reconnect mode=mock after_buffer=true");
        ESP_RETURN_ON_ERROR(app_connectivity_flush_buffer(connectivity), TAG, "buffer_flush_failed");
    }

    ESP_LOGI(
        TAG,
        "mqtt_publish topic=%s qos=1 retain=false payload=%s",
        connectivity->telemetry_topic,
        payload
    );
    connectivity->successful_publishes += 1U;
    return ESP_OK;
}
