idf_component_register(
    SRCS "app_main.c"
    INCLUDE_DIRS "."
    REQUIRES battery config connectivity health logging scheduler sensors telemetry nvs_flash
)
