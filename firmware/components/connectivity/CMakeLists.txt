idf_component_register(
    SRCS "app_connectivity.c"
    INCLUDE_DIRS "include"
    REQUIRES config telemetry esp_timer
)
