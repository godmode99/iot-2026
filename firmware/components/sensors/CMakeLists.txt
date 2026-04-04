idf_component_register(
    SRCS "app_sensors.c"
    INCLUDE_DIRS "include"
    REQUIRES config driver esp_adc
)
