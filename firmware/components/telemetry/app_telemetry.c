#include "app_telemetry.h"

#include <string.h>

void app_telemetry_make_placeholder(
    const app_config_t *config,
    const app_battery_profile_t *profile,
    const app_health_snapshot_t *health,
    app_telemetry_t *telemetry
)
{
    if (config == NULL || profile == NULL || health == NULL || telemetry == NULL) {
        return;
    }

    memset(telemetry, 0, sizeof(*telemetry));
    telemetry->recorded_at_unix = health->uptime_ms / 1000;
    telemetry->temperature_c = 27.5f;
    telemetry->turbidity_raw = 123;
    telemetry->battery_percent = (profile->battery_variant[0] == 'l') ? 92.0f : 84.0f;
    telemetry->battery_mv = (profile->battery_variant[0] == 'l') ? 4040U : 3920U;
    telemetry->lat = 13.7563;
    telemetry->lng = 100.5018;
    telemetry->signal_quality = 0;
    telemetry->gps_fix_state = "none";
    (void)config;
}
