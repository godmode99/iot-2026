#pragma once

#include <stdbool.h>
#include <stdint.h>

#include "app_config.h"
#include "driver/i2c.h"
#include "driver/uart.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_err.h"

typedef struct {
    bool initialized;
    bool available;
    esp_err_t init_result;
} app_sensor_driver_status_t;

typedef struct {
    bool available;
    esp_err_t error;
    float value;
} app_sensor_float_reading_t;

typedef struct {
    bool available;
    esp_err_t error;
    int32_t value;
} app_sensor_int_reading_t;

typedef struct {
    bool available;
    esp_err_t error;
    uint32_t value;
} app_sensor_uint_reading_t;

typedef struct {
    bool available;
    esp_err_t error;
    double lat;
    double lng;
    uint8_t signal_quality;
    char fix_state[16];
} app_sensor_location_reading_t;

typedef struct {
    app_sensor_float_reading_t temperature_c;
    app_sensor_int_reading_t turbidity_raw;
    app_sensor_float_reading_t battery_percent;
    app_sensor_uint_reading_t battery_mv;
    app_sensor_location_reading_t location;
} app_sensor_sample_t;

typedef struct {
    app_sensor_driver_status_t ds18b20;
    app_sensor_driver_status_t turbidity_adc;
    app_sensor_driver_status_t max17048;
    app_sensor_driver_status_t l76k;
    adc_oneshot_unit_handle_t turbidity_adc_handle;
    bool turbidity_adc_ready;
    i2c_port_t fuel_gauge_i2c_port;
    bool fuel_gauge_i2c_ready;
    uart_port_t gps_uart_port;
    bool gps_uart_ready;
} app_sensors_t;

esp_err_t app_sensors_init(app_sensors_t *sensors);
esp_err_t app_sensors_read(app_sensors_t *sensors, app_sensor_sample_t *sample);
const char *app_sensor_driver_status_label(const app_sensor_driver_status_t *status);
