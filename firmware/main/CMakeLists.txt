idf_component_register(
    SRCS "app_main.c"
    INCLUDE_DIRS "."
    REQUIRES battery config health logging scheduler sensors telemetry nvs_flash
)
