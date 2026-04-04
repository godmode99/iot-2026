#include "app_sensors.h"

#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "sb00_sensors";

#define APP_DS18B20_GPIO GPIO_NUM_4
#define APP_TURBIDITY_ADC_UNIT ADC_UNIT_1
#define APP_TURBIDITY_ADC_CHANNEL ADC_CHANNEL_0
#define APP_I2C_PORT I2C_NUM_0
#define APP_I2C_SDA GPIO_NUM_8
#define APP_I2C_SCL GPIO_NUM_9
#define APP_I2C_CLOCK_HZ 100000
#define APP_MAX17048_I2C_ADDRESS 0x36
#define APP_MAX17048_REG_VCELL 0x02
#define APP_MAX17048_REG_SOC 0x04
#define APP_GPS_UART_PORT UART_NUM_1
#define APP_GPS_UART_TX GPIO_NUM_43
#define APP_GPS_UART_RX GPIO_NUM_44
#define APP_GPS_UART_BAUD 9600

static void app_sensor_mark_status(app_sensor_driver_status_t *status, bool available, esp_err_t result)
{
    if (status == NULL) {
        return;
    }

    status->initialized = true;
    status->available = available;
    status->init_result = result;
}

const char *app_sensor_driver_status_label(const app_sensor_driver_status_t *status)
{
    if (status == NULL || !status->initialized) {
        return "uninitialized";
    }

    if (status->available) {
        return "ready";
    }

    if (status->init_result == ESP_ERR_NOT_SUPPORTED) {
        return "unsupported";
    }

    if (status->init_result == ESP_ERR_NOT_FOUND) {
        return "not_found";
    }

    return "error";
}

static esp_err_t app_max17048_read_register(i2c_port_t port, uint8_t reg, uint8_t *data, size_t len)
{
    i2c_cmd_handle_t cmd;
    esp_err_t err;

    if (data == NULL || len == 0U) {
        return ESP_ERR_INVALID_ARG;
    }

    cmd = i2c_cmd_link_create();
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (APP_MAX17048_I2C_ADDRESS << 1) | I2C_MASTER_WRITE, true);
    i2c_master_write_byte(cmd, reg, true);
    i2c_master_start(cmd);
    i2c_master_write_byte(cmd, (APP_MAX17048_I2C_ADDRESS << 1) | I2C_MASTER_READ, true);
    if (len > 1U) {
        i2c_master_read(cmd, data, len - 1U, I2C_MASTER_ACK);
    }
    i2c_master_read_byte(cmd, &data[len - 1U], I2C_MASTER_NACK);
    i2c_master_stop(cmd);
    err = i2c_master_cmd_begin(port, cmd, pdMS_TO_TICKS(100));
    i2c_cmd_link_delete(cmd);
    return err;
}

static esp_err_t app_sensors_init_turbidity(app_sensors_t *sensors)
{
    adc_oneshot_unit_init_cfg_t init_cfg = {
        .unit_id = APP_TURBIDITY_ADC_UNIT,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    adc_oneshot_chan_cfg_t chan_cfg = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    esp_err_t err;

    err = adc_oneshot_new_unit(&init_cfg, &sensors->turbidity_adc_handle);
    if (err != ESP_OK) {
        app_sensor_mark_status(&sensors->turbidity_adc, false, err);
        ESP_LOGW(TAG, "turbidity_adc_init_failed=%s", esp_err_to_name(err));
        return err;
    }

    err = adc_oneshot_config_channel(sensors->turbidity_adc_handle, APP_TURBIDITY_ADC_CHANNEL, &chan_cfg);
    if (err != ESP_OK) {
        app_sensor_mark_status(&sensors->turbidity_adc, false, err);
        ESP_LOGW(TAG, "turbidity_adc_channel_config_failed=%s", esp_err_to_name(err));
        return err;
    }

    sensors->turbidity_adc_ready = true;
    app_sensor_mark_status(&sensors->turbidity_adc, true, ESP_OK);
    ESP_LOGI(TAG, "turbidity_adc_ready unit=%d channel=%d", APP_TURBIDITY_ADC_UNIT, APP_TURBIDITY_ADC_CHANNEL);
    return ESP_OK;
}

static esp_err_t app_sensors_init_max17048(app_sensors_t *sensors)
{
    i2c_config_t cfg = {
        .mode = I2C_MODE_MASTER,
        .sda_io_num = APP_I2C_SDA,
        .scl_io_num = APP_I2C_SCL,
        .sda_pullup_en = GPIO_PULLUP_ENABLE,
        .scl_pullup_en = GPIO_PULLUP_ENABLE,
        .master.clk_speed = APP_I2C_CLOCK_HZ,
        .clk_flags = 0,
    };
    uint8_t probe[2] = {0};
    esp_err_t err;

    sensors->fuel_gauge_i2c_port = APP_I2C_PORT;

    err = i2c_param_config(APP_I2C_PORT, &cfg);
    if (err != ESP_OK) {
        app_sensor_mark_status(&sensors->max17048, false, err);
        ESP_LOGW(TAG, "max17048_i2c_param_failed=%s", esp_err_to_name(err));
        return err;
    }

    err = i2c_driver_install(APP_I2C_PORT, cfg.mode, 0, 0, 0);
    if (err != ESP_OK && err != ESP_ERR_INVALID_STATE) {
        app_sensor_mark_status(&sensors->max17048, false, err);
        ESP_LOGW(TAG, "max17048_i2c_driver_failed=%s", esp_err_to_name(err));
        return err;
    }

    sensors->fuel_gauge_i2c_ready = true;
    err = app_max17048_read_register(APP_I2C_PORT, APP_MAX17048_REG_SOC, probe, sizeof(probe));
    if (err != ESP_OK) {
        app_sensor_mark_status(&sensors->max17048, false, ESP_ERR_NOT_FOUND);
        ESP_LOGW(TAG, "max17048_not_found sda=%d scl=%d", APP_I2C_SDA, APP_I2C_SCL);
        return err;
    }

    app_sensor_mark_status(&sensors->max17048, true, ESP_OK);
    ESP_LOGI(TAG, "max17048_ready port=%d sda=%d scl=%d", APP_I2C_PORT, APP_I2C_SDA, APP_I2C_SCL);
    return ESP_OK;
}

static esp_err_t app_sensors_init_gps(app_sensors_t *sensors)
{
    uart_config_t cfg = {
        .baud_rate = APP_GPS_UART_BAUD,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    esp_err_t err;

    sensors->gps_uart_port = APP_GPS_UART_PORT;

    err = uart_driver_install(APP_GPS_UART_PORT, 2048, 0, 0, NULL, 0);
    if (err != ESP_OK && err != ESP_ERR_INVALID_STATE) {
        app_sensor_mark_status(&sensors->l76k, false, err);
        ESP_LOGW(TAG, "gps_uart_driver_failed=%s", esp_err_to_name(err));
        return err;
    }

    err = uart_param_config(APP_GPS_UART_PORT, &cfg);
    if (err != ESP_OK) {
        app_sensor_mark_status(&sensors->l76k, false, err);
        ESP_LOGW(TAG, "gps_uart_param_failed=%s", esp_err_to_name(err));
        return err;
    }

    err = uart_set_pin(
        APP_GPS_UART_PORT,
        APP_GPS_UART_TX,
        APP_GPS_UART_RX,
        UART_PIN_NO_CHANGE,
        UART_PIN_NO_CHANGE
    );
    if (err != ESP_OK) {
        app_sensor_mark_status(&sensors->l76k, false, err);
        ESP_LOGW(TAG, "gps_uart_pin_failed=%s", esp_err_to_name(err));
        return err;
    }

    sensors->gps_uart_ready = true;
    app_sensor_mark_status(&sensors->l76k, true, ESP_OK);
    ESP_LOGI(TAG, "l76k_uart_ready port=%d tx=%d rx=%d", APP_GPS_UART_PORT, APP_GPS_UART_TX, APP_GPS_UART_RX);
    return ESP_OK;
}

static double app_nmea_coord_to_decimal(const char *raw, char hemisphere)
{
    double value;
    double degrees;
    double minutes;

    if (raw == NULL || raw[0] == '\0') {
        return NAN;
    }

    value = strtod(raw, NULL);
    degrees = floor(value / 100.0);
    minutes = value - (degrees * 100.0);
    value = degrees + (minutes / 60.0);

    if (hemisphere == 'S' || hemisphere == 'W') {
        value = -value;
    }

    return value;
}

static bool app_parse_rmc_sentence(char *line, app_sensor_location_reading_t *location)
{
    char *token;
    char *fields[8] = {0};
    size_t index = 0;
    double lat;
    double lng;

    token = strtok(line, ",");
    while (token != NULL && index < 8U) {
        fields[index++] = token;
        token = strtok(NULL, ",");
    }

    if (index < 7U || fields[2] == NULL || fields[2][0] == '\0') {
        return false;
    }

    if (fields[2][0] != 'A') {
        snprintf(location->fix_state, sizeof(location->fix_state), "no_fix");
        location->available = false;
        location->error = ESP_ERR_NOT_FOUND;
        return true;
    }

    lat = app_nmea_coord_to_decimal(fields[3], fields[4][0]);
    lng = app_nmea_coord_to_decimal(fields[5], fields[6][0]);
    if (isnan(lat) || isnan(lng)) {
        location->available = false;
        location->error = ESP_ERR_INVALID_RESPONSE;
        snprintf(location->fix_state, sizeof(location->fix_state), "invalid");
        return true;
    }

    location->available = true;
    location->error = ESP_OK;
    location->lat = lat;
    location->lng = lng;
    location->signal_quality = 1;
    snprintf(location->fix_state, sizeof(location->fix_state), "fix");
    return true;
}

static void app_sensors_read_turbidity(app_sensors_t *sensors, app_sensor_sample_t *sample)
{
    int raw = 0;
    esp_err_t err;

    sample->turbidity_raw.available = false;
    sample->turbidity_raw.error = sensors->turbidity_adc.init_result;

    if (!sensors->turbidity_adc.available || !sensors->turbidity_adc_ready) {
        return;
    }

    err = adc_oneshot_read(sensors->turbidity_adc_handle, APP_TURBIDITY_ADC_CHANNEL, &raw);
    if (err != ESP_OK) {
        sample->turbidity_raw.error = err;
        ESP_LOGW(TAG, "turbidity_adc_read_failed=%s", esp_err_to_name(err));
        return;
    }

    sample->turbidity_raw.available = true;
    sample->turbidity_raw.error = ESP_OK;
    sample->turbidity_raw.value = raw;
}

static void app_sensors_read_max17048(app_sensors_t *sensors, app_sensor_sample_t *sample)
{
    uint8_t soc_raw[2] = {0};
    uint8_t vcell_raw[2] = {0};
    uint16_t soc_register;
    uint16_t vcell_register;
    esp_err_t err;

    sample->battery_percent.available = false;
    sample->battery_percent.error = sensors->max17048.init_result;
    sample->battery_mv.available = false;
    sample->battery_mv.error = sensors->max17048.init_result;

    if (!sensors->max17048.available || !sensors->fuel_gauge_i2c_ready) {
        return;
    }

    err = app_max17048_read_register(sensors->fuel_gauge_i2c_port, APP_MAX17048_REG_SOC, soc_raw, sizeof(soc_raw));
    if (err != ESP_OK) {
        sample->battery_percent.error = err;
        sample->battery_mv.error = err;
        ESP_LOGW(TAG, "max17048_soc_read_failed=%s", esp_err_to_name(err));
        return;
    }

    err = app_max17048_read_register(
        sensors->fuel_gauge_i2c_port,
        APP_MAX17048_REG_VCELL,
        vcell_raw,
        sizeof(vcell_raw)
    );
    if (err != ESP_OK) {
        sample->battery_percent.error = err;
        sample->battery_mv.error = err;
        ESP_LOGW(TAG, "max17048_vcell_read_failed=%s", esp_err_to_name(err));
        return;
    }

    soc_register = ((uint16_t)soc_raw[0] << 8) | soc_raw[1];
    vcell_register = ((uint16_t)vcell_raw[0] << 8) | vcell_raw[1];

    sample->battery_percent.available = true;
    sample->battery_percent.error = ESP_OK;
    sample->battery_percent.value = (float)soc_register / 256.0f;

    sample->battery_mv.available = true;
    sample->battery_mv.error = ESP_OK;
    sample->battery_mv.value = (uint32_t)(((uint64_t)vcell_register * 625ULL) / 8000ULL);
}

static void app_sensors_read_gps(app_sensors_t *sensors, app_sensor_sample_t *sample)
{
    uint8_t rx_buffer[256];
    size_t buffered = 0;
    int bytes_read;
    char *line;
    char working[256];

    sample->location.available = false;
    sample->location.error = sensors->l76k.init_result;
    sample->location.signal_quality = 0;
    snprintf(sample->location.fix_state, sizeof(sample->location.fix_state), "unavailable");

    if (!sensors->l76k.available || !sensors->gps_uart_ready) {
        return;
    }

    ESP_ERROR_CHECK_WITHOUT_ABORT(uart_get_buffered_data_len(sensors->gps_uart_port, &buffered));
    if (buffered == 0U) {
        sample->location.error = ESP_ERR_NOT_FOUND;
        snprintf(sample->location.fix_state, sizeof(sample->location.fix_state), "no_data");
        return;
    }

    if (buffered >= sizeof(rx_buffer)) {
        buffered = sizeof(rx_buffer) - 1U;
    }

    bytes_read = uart_read_bytes(sensors->gps_uart_port, rx_buffer, buffered, pdMS_TO_TICKS(50));
    if (bytes_read <= 0) {
        sample->location.error = ESP_ERR_TIMEOUT;
        snprintf(sample->location.fix_state, sizeof(sample->location.fix_state), "timeout");
        return;
    }

    rx_buffer[bytes_read] = '\0';
    memcpy(working, rx_buffer, bytes_read + 1);

    line = strtok(working, "\r\n");
    while (line != NULL) {
        if (strncmp(line, "$GPRMC", 6) == 0 || strncmp(line, "$GNRMC", 6) == 0) {
            if (app_parse_rmc_sentence(line, &sample->location)) {
                return;
            }
        }
        line = strtok(NULL, "\r\n");
    }

    sample->location.error = ESP_ERR_INVALID_RESPONSE;
    snprintf(sample->location.fix_state, sizeof(sample->location.fix_state), "parse_err");
}

esp_err_t app_sensors_init(app_sensors_t *sensors)
{
    if (sensors == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    memset(sensors, 0, sizeof(*sensors));

    gpio_reset_pin(APP_DS18B20_GPIO);
    gpio_set_direction(APP_DS18B20_GPIO, GPIO_MODE_INPUT);
    gpio_set_pull_mode(APP_DS18B20_GPIO, GPIO_PULLUP_ONLY);
    app_sensor_mark_status(&sensors->ds18b20, false, ESP_ERR_NOT_SUPPORTED);
    ESP_LOGW(TAG, "ds18b20_driver_pending gpio=%d reason=no_onewire_backend", APP_DS18B20_GPIO);

    app_sensors_init_turbidity(sensors);
    app_sensors_init_max17048(sensors);
    app_sensors_init_gps(sensors);

    return ESP_OK;
}

esp_err_t app_sensors_read(app_sensors_t *sensors, app_sensor_sample_t *sample)
{
    if (sensors == NULL || sample == NULL) {
        return ESP_ERR_INVALID_ARG;
    }

    memset(sample, 0, sizeof(*sample));
    sample->temperature_c.available = false;
    sample->temperature_c.error = sensors->ds18b20.init_result;
    sample->battery_percent.value = NAN;
    snprintf(sample->location.fix_state, sizeof(sample->location.fix_state), "uninitialized");

    app_sensors_read_turbidity(sensors, sample);
    app_sensors_read_max17048(sensors, sample);
    app_sensors_read_gps(sensors, sample);

    return ESP_OK;
}
