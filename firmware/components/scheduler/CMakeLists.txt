idf_component_register(
    SRCS "app_scheduler.c"
    INCLUDE_DIRS "include"
    REQUIRES battery config freertos health logging telemetry esp_timer esp_system
)
