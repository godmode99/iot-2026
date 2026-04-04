#include "app_telemetry.h"

#include <string.h>

void app_telemetry_from_sensor_sample(
    const app_config_t *config,
    const app_battery_profile_t *profile,
    const app_health_snapshot_t *health,
    const app_sensor_sample_t *sample,
    app_telemetry_t *telemetry
)
{
    if (config == NULL || profile == NULL || health == NULL || sample == NULL || telemetry == NULL) {
        return;
    }

    memset(telemetry, 0, sizeof(*telemetry));
    telemetry->recorded_at_unix = health->uptime_ms / 1000;
    telemetry->has_temperature_c = sample->temperature_c.available;
    telemetry->temperature_c = sample->temperature_c.value;
    telemetry->has_turbidity_raw = sample->turbidity_raw.available;
    telemetry->turbidity_raw = sample->turbidity_raw.value;
    telemetry->has_battery_percent = sample->battery_percent.available;
    telemetry->battery_percent = sample->battery_percent.value;
    telemetry->has_battery_mv = sample->battery_mv.available;
    telemetry->battery_mv = sample->battery_mv.value;
    telemetry->has_location = sample->location.available;
    telemetry->lat = sample->location.lat;
    telemetry->lng = sample->location.lng;
    telemetry->has_signal_quality = sample->location.available;
    telemetry->signal_quality = sample->location.signal_quality;
    strncpy(telemetry->gps_fix_state, sample->location.fix_state, sizeof(telemetry->gps_fix_state) - 1);
    (void)config;
    (void)profile;
}
