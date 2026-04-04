$ErrorActionPreference = "Stop"

$env:IDF_PATH = "C:\Espressif\5.4\esp-idf"
$env:IDF_TOOLS_PATH = "C:\Espressif\tools"
$env:IDF_PYTHON_ENV_PATH = "C:\Espressif\tools\python\5.4\venv"
$env:ESP_ROM_ELF_DIR = "C:\Espressif\tools\esp-rom-elfs\20241011"
$env:PATH = "C:\Espressif\tools\xtensa-esp-elf\esp-14.2.0_20250730\xtensa-esp-elf\bin;C:\Espressif\tools\riscv32-esp-elf\esp-15.2.0_20251204\riscv32-esp-elf\bin;C:\Espressif\tools\cmake\3.30.2\bin;C:\Espressif\tools\ninja\1.12.1;C:\Espressif\tools\ccache\4.11.2;C:\Espressif\tools\idf-exe\1.0.3;$env:PATH"

Push-Location (Join-Path $PSScriptRoot "..\firmware")
try {
    & "C:\Espressif\tools\python\5.4\venv\Scripts\python.exe" "C:\Espressif\5.4\esp-idf\tools\idf.py" build
}
finally {
    Pop-Location
}
