idf_component_register(
    SRCS "app_scheduler.c"
    INCLUDE_DIRS "include"
    REQUIRES battery config connectivity freertos health logging sensors telemetry esp_timer esp_system
)
