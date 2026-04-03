# SB-00 AquaSense IoT — Firmware & Hardware

**Version 1.1 | March 2026 | Confidential**

> **Reference baseline:** เอกสารนี้อ้างอิงสมมติฐานกลางใน [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) | **Last synced:** 2026-04-02

---

# 1. ภาพรวมระบบ (System Overview)

SB-00 คือ Sensor Box รุ่น Mobile สำหรับตรวจวัดคุณภาพน้ำแบบ real-time รองรับการติดตั้งได้ 2 แบบ ได้แก่ ทุ่นลอยน้ำ และ ไม้ปักในบ่อ ออกแบบให้ถอดเปลี่ยน sensor ได้ง่าย รองรับสภาพแวดล้อมน้ำเค็ม น้ำจืด แดด และฝน

## 1.1 ความแตกต่างหลักจาก SB-01

| คุณสมบัติ   | SB-00 (Mobile)         | SB-01 (Fixed)             |
| ----------- | ---------------------- | ------------------------- |
| การติดตั้ง  | ทุ่นลอยน้ำ หรือ ไม้ปัก | ยึดเสา / แขวนฝั่ง (คงที่) |
| GPS         | มี (จำเป็น)            | ไม่มี                     |
| เคลื่อนย้าย | ย้ายได้ทุกจุดในบ่อ     | Fixed position            |
| Power       | Battery only           | DC + Battery              |
| กันน้ำ      | IP67/IP68 (โดนน้ำได้)  | IP65 (กันฝน)              |
| Sensor swap | ถอดเปลี่ยนได้          | ถอดเปลี่ยนได้ง่าย         |
| 4G          | มี                     | มี                        |

## 1.2 Sensing Points เริ่มต้น (MVP)

| #   | Sensor                          | รุ่น                    | วัดอะไร                   | หมายเหตุ                             |
| --- | ------------------------------- | ----------------------- | ------------------------- | ------------------------------------ |
| T1  | Temperature                     | DS18B20 Waterproof      | อุณหภูมิน้ำ               | กันน้ำ IP68                          |
| TUR | Turbidity (Phase 1)             | Analog Turbidity Sensor | ความขุ่น (ค่าประมาณ)      | ใช้ ADC — สำหรับ dev/test เท่านั้น   |
| TUR | Turbidity (Phase 2+ Production) | DFRobot SEN0600 (RS485) | ความขุ่น (NTU) + อุณหภูมิ | RS485 Modbus RTU, ISO 7027, ทน noise |

> **หมายเหตุ:** เริ่มต้น 2 sensor ก่อน (Temperature + Turbidity) เพื่อควบคุมต้นทุน MVP หากลูกค้าต้องการเพิ่ม sensor ชนิดอื่น ต้องให้ทีมทำ wiring ให้ก่อน Phase 1 ใช้ analog turbidity sensor ราคาถูกทดสอบ pipeline ทั้งระบบ แล้ว Phase 2 อัพเกรดเป็น SEN0600 RS485 สำหรับ production

## 1.3 System Architecture (ภาพรวม Component)

| Layer              | Component                  | เชื่อมต่อผ่าน                                                         | หมายเหตุ                       |
| ------------------ | -------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| Sensor Layer       | DS18B20 (Temperature)      | OneWire → GPIO4                                                       | IP68, probe ห้อยในน้ำ          |
| Sensor Layer       | Turbidity Sensor           | Phase 1: ADC → GPIO (analog) / Phase 2+: RS485 → MAX485 → GPIO9/10/11 | probe ห้อยในน้ำ                |
| Sensor Layer       | GPS L76K (default) / NEO-M8N fallback | UART → GPIO13/14                                          | บน enclosure รับสัญญาณดาวเทียม |
| Power Layer        | Battery module (`Standard` / `Long-Life`) | → charger/protection/BMS ตาม battery variant                           | `Standard` baseline ≥ 12 วัน @ 5 นาที; `Long-Life` เป็น optional upgrade |
| Power Layer        | AP2112K LDO                | Battery → 3.3V rail                                                   | จ่ายไฟ ESP32-S3 + sensors      |
| Power Layer        | MAX17048 Fuel Gauge        | I2C → GPIO5/6                                                         | แจ้ง battery % แบบ real-time   |
| MCU Layer          | ESP32-S3 (FS-HCore-A7670C) | Central controller                                                    | firmware, sleep, OTA, BLE      |
| Connectivity Layer | A7670E 4G LTE (production default) / SIM7670C on FS-HCore dev board | UART → GPIO17/18                   | ส่งข้อมูล MQTT over TLS        |
| Cloud Layer        | HiveMQ → Vercel → Supabase | Internet                                                              | backend, dashboard, alert      |

## 1.4 Sensing Point & Depth

probe ทั้งหมดห้อยลงน้ำผ่าน cable gland ที่ฝากล่อง — ความลึกปรับได้โดยเลื่อนสายขึ้นลงแล้วขันสกรู cable gland

| Sensor                | ตำแหน่ง           | ความลึกแนะนำ       | เหตุผล                                           |
| --------------------- | ----------------- | ------------------ | ------------------------------------------------ |
| DS18B20 (Temperature) | ห้อยในน้ำ         | 20-30 cm จากผิวน้ำ | วัด water column ตัวแทน — ไม่ร้อนจากแสงแดดผิวน้ำ |
| Turbidity Probe       | ห้อยในน้ำ         | 20-30 cm จากผิวน้ำ | หลีกเลี่ยง surface debris + sediment ที่พื้น     |
| GPS (L76K)            | บน enclosure      | เหนือน้ำ           | ต้องการ clear sky view — ห้ามจมน้ำ               |
| 4G Antenna            | บน/ข้าง enclosure | เหนือน้ำ           | signal แรงกว่าถ้าสูง — ติดตั้งให้สูงจากผิวน้ำ    |

> **หมายเหตุ:** ความลึก 20-30 cm เป็นค่าแนะนำสำหรับบ่อหอยแครง — ปรับได้ตามความลึกจริงของบ่อ ลูกค้าทำเองได้โดยไม่ต้องแจ้งทีม

# 2. Hardware Architecture

## 2.1 MCU — ESP32-S3

ใช้ ESP32-S3 (WROOM-1) เป็น MCU หลัก เหตุผลที่เลือก:

- Deep sleep current ต่ำกว่า ESP32 รุ่นเดิม (~7µA vs ~10µA) — สำคัญมากสำหรับ Battery-only
- มี USB-OTG ในตัว — สะดวกสำหรับ firmware update ตอนผลิต
- รองรับ BLE 5.0 — ยังไม่ใช้เป็น customer-facing provisioning baseline ในเอกสาร v1.1; ถ้าทดลองให้ใช้ภายในเท่านั้น
- รองรับ OneWire, ADC, UART ครบ
- ราคาใกล้เคียง ESP32 รุ่นเดิม

## 2.2 4G Module — Prototype vs Production

> **Baseline decision:** Phase 1 ใช้ `FS-HCore-A7670C` dev board (มี SIM7670C บนบอร์ด) ส่วน Phase 2+ บน custom PCB ให้ยึด `A7670E` เป็น production default
>
> `SIM7670E` ใช้เป็น sourcing fallback ได้ ถ้า footprint/assembly สะดวกกว่าและ AT command compatibility ยังตรงกับ firmware baseline

> **Locked fallback rule:** ใช้ `SIM7670E` ได้เมื่อ `A7670E` unavailable, lead time > 14 วัน, หรือ price delta > 20% และ bench validation ผ่านครบเรื่อง power-up, MQTT over TLS, และ OTA flow ก่อน freeze BOM

| คุณสมบัติ             | SIM7670E / A7670C / A7670E | หมายเหตุ                            |
| --------------------- | -------------------------- | ----------------------------------- |
| Band Support          | LTE Cat 1 (B1/3/5/8)       | ใช้ได้ AIS/TRUE/DTAC ในไทย          |
| Data Rate             | 10Mbps DL / 5Mbps UL       | เพียงพอสำหรับ IoT telemetry         |
| Sleep Current (PSM)   | ~1.2mA                     | ประหยัดแบตตอน sleep                 |
| Interface             | UART (AT commands)         | firmware คุยผ่าน AT command ทั้งหมด |
| ราคา (module แยก)     | ~150-200 THB               | LCSC / AliExpress                   |
| ราคา (FS-HCore board) | ~550 THB                   | รวม ESP32-S3 — ใช้ Phase 1          |

> **หมายเหตุ:** Phase 1 ใช้ FS-HCore-A7670C (SIM7670C) — Phase 2+ ใช้ A7670E บน PCB custom เป็นค่าเริ่มต้น — ถ้าจำเป็นค่อยสลับเป็น SIM7670E โดยไม่เปลี่ยน provisioning/security flow

| FS-HCore-A7670C Spec | ค่า                                               |
| -------------------- | ------------------------------------------------- |
| MCU                  | ESP32-S3 (dual-core 240MHz, 8MB Flash, 8MB PSRAM) |
| 4G Module            | SIM7670C (LTE Cat 1, Band 1/3/5/8)                |
| USB                  | USB-C สำหรับ firmware flash + serial monitor      |
| GPIO                 | เข้าถึง GPIO ได้ครบผ่าน header pin                |
| ราคา                 | ~550 THB (Shopee/AliExpress)                      |
| ใช้ใน                | Phase 1 Prototype — ก่อนทำ PCB custom             |

## 2.3 GPS Module

SB-00 ต้องมี GPS เพราะเคลื่อนที่ได้ — ต้องรู้ตำแหน่งทุ่นตลอดเวลา

> **Baseline decision:** `L76K` เป็น GPS default ทั้ง prototype และ production ส่วน `NEO-M8N` เป็น fallback เฉพาะเมื่อ Stage A/B field test ชี้ว่า `L76K` ไม่ผ่าน trigger ที่ล็อกไว้
>
> **Locked fallback trigger:** สลับเป็น `NEO-M8N` เมื่อ median TTFF หลัง wake > 60 วินาที, stationary open-sky error > 15 m มากกว่า 10% ของ sample, หรือ geofence false alert > 2 ครั้ง/เครื่อง/สัปดาห์

| Module         | Protocol | ราคา     | หมายเหตุ            |
| -------------- | -------- | -------- | ------------------- |
| u-blox NEO-M8N | UART/I2C | ~500 THB | แม่นยำ, ใช้งานกว้าง |
| L76K (ราคาถูก) | UART     | ~150 THB | พอใช้สำหรับ MVP     |

- GPS ส่ง coordinates ทุกรอบ พร้อม sensor data
- ระบบ Geofence Alert — แจ้งเตือนถ้าทุ่นหลุดออกนอกพื้นที่
- แสดงตำแหน่งบน Map บน dashboard

## 2.3.5 Key IC Specifications

### AP2112K-3.3 LDO Regulator

| Spec                | ค่า            | หมายเหตุ                                       |
| ------------------- | -------------- | ---------------------------------------------- |
| Output voltage      | 3.3V fixed     | ป้อน ESP32-S3 + sensors                        |
| Max output current  | 600mA          | เพียงพอ — ESP32-S3 max ~240mA + sensors ~100mA |
| Input voltage range | 2.5V - 6V      | รับจาก battery 3.2-4.2V ได้โดยตรง              |
| Quiescent current   | 55µA           | กินตลอดเวลา — รวมใน sleep current              |
| Dropout voltage     | 250mV @ 600mA  | ทำงานได้ถึง battery 3.55V                      |
| Package             | SOT-25 (5-pin) | SMD เล็ก — ต้องบัดกรีด้วย hot air หรือ PCBA    |
| ราคา                | ~3 THB/ชิ้น    | LCSC part: C89358                              |

> **หมายเหตุ:** AP2112K หยุดทำงานถ้า battery < 3.55V (dropout) — แต่ ESP32 brownout detector จะ reset ก่อนที่ 2.6V อยู่แล้ว ไม่มีปัญหา

### MAX17048 Fuel Gauge

| Spec                | ค่า                        | หมายเหตุ                                 |
| ------------------- | -------------------------- | ---------------------------------------- |
| Interface           | I2C (address 0x36)         | GPIO5/6 — 4.7kΩ pull-up                  |
| Voltage measurement | 2.5V - 5V, ±7.5mV accuracy | วัด battery voltage โดยตรง               |
| SOC estimation      | ModelGauge algorithm       | ประมาณ % จาก voltage curve ของ Li-ion    |
| Alert threshold     | programmable low SOC       | ตั้ง alert ที่ 15% และ 10%               |
| Sleep current       | 23µA                       | always on — รวมใน total sleep current    |
| Package             | SOT-23-6 (6-pin)           | SMD เล็กมาก — ต้อง PCBA หรือ steady hand |
| ราคา                | ~15 THB/ชิ้น               | LCSC part: C82148                        |

### SI2301 P-Channel MOSFET

| Spec       | ค่า                                     | หมายเหตุ                                    |
| ---------- | --------------------------------------- | ------------------------------------------- |
| Type       | P-Channel enhancement mode              | Gate LOW = ON, Gate HIGH = OFF              |
| Vds max    | -20V                                    | เกินพอสำหรับ 3.3V rail                      |
| Id max     | -2.3A                                   | sensor รวม ~150mA — เหลือเฟือ               |
| Rds(on)    | 0.11Ω @ Vgs=-4.5V                       | voltage drop = 0.11 × 0.15 = 16mV น้อยมาก   |
| Vgs(th)    | -0.4V to -1.0V                          | turn on ที่ gate ต่ำกว่า source ~0.5V       |
| Package    | SOT-23 (3-pin)                          | SMD — ทิศทาง: pin 1=Gate, 2=Source, 3=Drain |
| Gate drive | GPIO15 (3.3V) ผ่าน 10kΩ + 100kΩ pull-up | Source ต่อ 3.3V, Drain ต่อ V_SNS rail       |
| ราคา       | ~2 THB/ชิ้น                             | LCSC part: C10487                           |

## 2.4 Sensor Details

### DS18B20 Waterproof (Temperature)

- Protocol: OneWire — ใช้ GPIO เดียวได้หลายตัว
- ความแม่นยำ: ±0.5°C — factory calibrated
- Resolution: 12-bit (0.0625°C)
- Connector: JST 3-pin — ถอดเปลี่ยนได้ง่าย
- IP68 — แช่น้ำได้ถาวร

### Turbidity Sensor (Phased Approach)

**Phase 1 — Analog Turbidity Sensor (Dev/Test)**

- Protocol: Analog output (0-4.5V) → ADC read ผ่าน Level Shifter (5V→3.3V)
- Range: ค่าประมาณ — ไม่มี standard NTU ที่เชื่อถือได้
- ใช้สำหรับทดสอบ firmware pipeline + backend + dashboard เท่านั้น
- ราคา: ~413 THB (Shopee)
- ไม่ต้องใช้ MAX485 module

**Phase 2+ — DFRobot SEN0600 Turbidity (RS485 Production)**

- Protocol: RS485 (Modbus RTU) — ทน noise ดีกว่า analog
- หลักการวัด: 90° Scattered Light ตามมาตรฐาน ISO 7027
- วัดได้ทั้ง ความขุ่น (NTU) + อุณหภูมิ ในตัวเดียว
- Range: 0-1000 NTU — เพียงพอสำหรับบ่อน้ำทั่วไป
- Interface กับ ESP32: ผ่าน MAX485 module
- ราคา: ~913 THB (DigiKey) — lead time ~9 สัปดาห์
- สั่งล่วงหน้าตอนเริ่ม Phase 2

> **หมายเหตุ:** เหตุผลที่ไม่ใช้ analog sensor ใน production: สัญญาณ analog อ่อนไหวต่อ EMI noise จากปั๊มน้ำ/เครื่องตีน้ำในฟาร์ม ค่าไม่มี standard NTU ที่เชื่อถือได้ ไม่เหมาะสำหรับ commercial product แม้สายสั้น 1-2 เมตร

## 2.5 Power System — Battery Only

SB-00 ใช้ Battery เท่านั้น เพราะเป็นทุ่นลอย ไม่มี DC supply

| Component           | Active Current               | Sleep Current | หมายเหตุ             |
| ------------------- | ---------------------------- | ------------- | -------------------- |
| ESP32-S3            | 240mA                        | 7µA           | Deep sleep           |
| SIM7670E            | 500mA peak, 80mA avg         | 1.2mA (PSM)   | ตอน transmit         |
| DS18B20             | 1.5mA                        | 0             | ตัด MOSFET ตอน sleep |
| Turbidity Sensor    | 40mA (RS485) / 20mA (analog) | 0             | ตัด MOSFET ตอน sleep |
| GPS Module          | 25mA                         | 5µA           |                      |
| MAX485              | 1mA                          | 0             | ตัด MOSFET ตอน sleep |
| AP2112K LDO         | -                            | 55µA          | Quiescent            |
| MAX17048 Fuel Gauge | -                            | 23µA          | Always on            |

### Battery Recommendation

| Variant | Battery                    | Capacity  | Runtime (realistic) | ราคาโดยประมาณ | หมายเหตุ |
| ------- | -------------------------- | --------- | ------------------- | -------------- | -------- |
| Standard | 18650 Li-ion x2 (parallel) | 6,800 mAh | ≥12 วัน (stretch 14-16 วัน) ★ | 300 THB | baseline หลัก |
| Long-Life | 18650 Li-ion x8-x10 (parallel) | 27,200-34,000 mAh | เป้าหมายเชิงสถาปัตย์: `>= 30 วัน @ 5 นาที` หรือ `>= 60 วัน @ 10 นาที` | 1,200-1,500 THB เฉพาะ cell | ต้องใช้ battery pack และ enclosure ใหญ่ขึ้น |
| Reference only | LiFePO4 26650 x2           | 6,400 mAh | ~15 วัน             | 500 THB | ไม่ใช่ modular baseline หลัก |

### Battery Brand Recommendation

| Brand              | Model        | Capacity                | ราคา/ก้อน | หมายเหตุ                        |
| ------------------ | ------------ | ----------------------- | --------- | ------------------------------- |
| Samsung            | INR18650-35E | 3,500 mAh               | ~120 THB  | แนะนำ — ของแท้, cycle life 500+ |
| Panasonic          | NCR18650B    | 3,400 mAh               | ~130 THB  | เกรด industrial ดีมาก           |
| Generic (ไม่แนะนำ) | ไม่ระบุ      | capacity ไม่น่าเชื่อถือ | <80 THB   | ความจุจริงอาจต่ำกว่า label มาก  |

### Runtime Calculation (2 × Samsung 35E @ interval 5 นาที)

| รายการ                           | ค่า                   | คำนวณ                        |
| -------------------------------- | --------------------- | ---------------------------- |
| Capacity รวม                     | 7,000 mAh (2 × 3,500) | parallel                     |
| Usable capacity (80%)            | 5,600 mAh             | หลีกเลี่ยง deep discharge    |
| Energy per cycle (active ~15 วิ) | ~2.5 mAh              | (240+500+50) mA × 15s / 3600 |
| Energy per cycle (sleep ~285 วิ) | ~0.19 mAh             | 8.3µA × 285s / 3600          |
| Total per cycle (5 นาที)         | ~2.69 mAh             |                              |
| Cycles per day                   | 288                   | 24h × 60m / 5m               |
| mAh per day                      | ~775 mAh              | 2.69 × 288                   |
| Runtime conservative             | ~7.2 วัน              | 5,600 / 775                  |
| Runtime pass target              | ≥12 วัน               | หลังเปิด PSM + battery-aware interval control |
| Runtime stretch target           | ~14-16 วัน            | ถ้า PSM mode ทำงานดี         |

> **หมายเหตุ:** `Standard` ใช้ 18650 x2 parallel เป็น baseline หลักของโปรเจ็กต์รอบ prototype/pilot ส่วน `Long-Life` เป็น battery module สำหรับงานที่ต้องการ runtime สูงขึ้นโดยยอมรับ pack ใหญ่ขึ้น ต้นทุนสูงขึ้น และ enclosure ลึกขึ้น

- เพิ่ม Bulk capacitor 470µF ที่ VBAT pin ของ SIM7670E — ป้องกัน brownout ตอน transmit
- MOSFET switch ตัดไฟ sensor ตอน deep sleep — ประหยัดพลังงานได้มาก
- PSM (Power Saving Mode) บน 4G module ระหว่าง sleep cycle

## 2.6 Key Component Specifications

### AP2112K-3.3 LDO Regulator

| Spec                | ค่า            | หมายเหตุ                                         |
| ------------------- | -------------- | ------------------------------------------------ |
| Output voltage      | 3.3V fixed     |                                                  |
| Max output current  | 600mA          | เพียงพอสำหรับ ESP32-S3 (240mA) + sensors (~60mA) |
| Dropout voltage     | 250mV @ 600mA  | ทำงานได้แม้ battery เหลือ 3.55V                  |
| Quiescent current   | 55µA           | กินไฟตลอดเวลา — สำคัญสำหรับ sleep current        |
| Input voltage range | 2.5-6V         | รับได้จาก battery 3.7V โดยตรง                    |
| Package             | SOT-25 (5-pin) | SMD ขนาดเล็ก                                     |
| ราคา                | ~5 THB         | LCSC                                             |

### MAX17048 Fuel Gauge

| Spec              | ค่า                | หมายเหตุ                                 |
| ----------------- | ------------------ | ---------------------------------------- |
| Interface         | I2C (address 0x36) | ต่อกับ GPIO5/6                           |
| Accuracy          | ±1% SOC            | แม่นยำกว่าวัด voltage อย่างเดียว         |
| Supply voltage    | 2.5-4.5V           | ต่อกับ battery โดยตรง (VBAT)             |
| Quiescent current | 23µA               | always-on — วัด battery ตลอดเวลา         |
| Alert interrupt   | มี (ALRT pin)      | แจ้งเตือนเมื่อ battery ต่ำกว่า threshold |
| Package           | TDFN-1x1 (8-pin)   | SMD ขนาดเล็กมาก — ต้องระวังตอน solder    |
| ราคา              | ~35 THB            | LCSC                                     |

### SI2301 P-Channel MOSFET

| Spec                   | ค่า                         | หมายเหตุ                        |
| ---------------------- | --------------------------- | ------------------------------- |
| Type                   | P-Channel Enhancement       | ON เมื่อ Gate ต่ำกว่า Source    |
| Vgs threshold          | -0.4V to -1.0V              | GPIO 3.3V → 0V เพียงพอเปิด/ปิด  |
| Max drain current (Id) | 2.3A                        | เหลือเฟือสำหรับ sensor ~60mA    |
| Rds(on) @ Vgs=-2.5V    | 0.11Ω                       | แรงดันตกน้อยมาก                 |
| Max Vds                | -20V                        |                                 |
| Package                | SOT-23 (3-pin)              | SMD ขนาดเล็ก                    |
| Gate resistor แนะนำ    | 10kΩ series + 100kΩ pull-up | ป้องกัน floating + limit inrush |
| ราคา                   | ~3 THB                      | LCSC                            |

## 2.7 Battery Charging Circuit

ใช้ TP4056 เป็น charger IC สำหรับ Li-ion 18650 — ราคาถูก, หาซื้อง่าย, มี protection ในตัว

| TP4056 Pin         | เชื่อมต่อ                       | หมายเหตุ                |
| ------------------ | ------------------------------- | ----------------------- |
| IN+                | USB-C VBUS (5V)                 | รับไฟจาก USB-C          |
| IN-                | GND                             |                         |
| BAT                | 18650 positive terminal         | ต่อผ่าน DW01 protection |
| GND                | GND                             |                         |
| CHRG (active LOW)  | LED indicator / GPIO (optional) | แสดงสถานะกำลังชาร์จ     |
| STDBY (active LOW) | LED indicator / GPIO (optional) | แสดงสถานะชาร์จเต็ม      |

| พารามิเตอร์                | ค่า                     | หมายเหตุ                             |
| -------------------------- | ----------------------- | ------------------------------------ |
| Charge current             | 500mA (default) หรือ 1A | ปรับด้วย RPROG resistor — 1.2kΩ = 1A |
| Charge voltage             | 4.2V                    | fixed ใน IC                          |
| Trickle charge threshold   | 2.9V                    | ถ้าแบตต่ำกว่านี้จะ trickle ก่อน      |
| Charge time (6800mAh @ 1A) | ~7-8 ชั่วโมง            | จาก 0% ถึง 100%                      |
| Input voltage range        | 4.5-6V                  | USB-C 5V พอดี                        |

## 2.7 Battery Protection Circuit

ใช้ DW01A + FS8205A dual MOSFET เป็น battery protection IC — ป้องกัน 3 กรณีหลัก

| การป้องกัน     | Threshold           | Action                                |
| -------------- | ------------------- | ------------------------------------- |
| Overcharge     | > 4.28V             | ตัดไฟ charger ออก                     |
| Over-discharge | < 2.5V              | ตัดไฟ load ออก — ป้องกัน cell เสียหาย |
| Short circuit  | current spike > ~3A | ตัดภายใน microseconds                 |
| Overcurrent    | > 3A sustained      | ตัดไฟ load                            |

| DW01A Spec               | ค่า            | หมายเหตุ           |
| ------------------------ | -------------- | ------------------ |
| Overcharge threshold     | 4.28V ± 25mV   | ตัด charger        |
| Over-discharge threshold | 2.5V ± 100mV   | ตัด load           |
| Overcurrent threshold    | ~3A (internal) | ตัดภายใน µs        |
| Package                  | SOT-23-6       | LCSC part: C351231 |
| ราคา                     | ~3 THB/ชิ้น    |                    |

| FS8205A Spec | ค่า                   | หมายเหตุ                         |
| ------------ | --------------------- | -------------------------------- |
| Type         | Dual N-Channel MOSFET | ทำงานคู่กับ DW01A                |
| Rds(on)      | 30mΩ per channel      | voltage drop ต่ำมาก              |
| Max current  | 6A per channel        | เกินพอสำหรับ battery application |
| Package      | SOT-23-6              | LCSC part: C916030               |
| ราคา         | ~3 THB/ชิ้น           |                                  |

> **หมายเหตุ:** DW01A + FS8205A เป็น combo ที่นิยมใช้ใน 18650 battery pack DIY — ราคา ~6 THB/ชุด หาซื้อได้ที่ LCSC หรือ Shopee

## 2.7.5 Bulk Capacitor Specification

Bulk capacitor ที่ VBAT ของ SIM7670E — จำเป็นมากสำหรับป้องกัน brownout ตอน 4G transmit peak 2A

| Spec                      | ค่า                                   | หมายเหตุ                                   |
| ------------------------- | ------------------------------------- | ------------------------------------------ |
| Capacitance (หลัก)        | 470µF electrolytic                    | รับ current surge ช่วงสั้น                 |
| Capacitance (เสริม)       | 10µF ceramic (X5R/X7R)                | ลด high-frequency noise                    |
| Voltage rating            | ≥ 10V (แนะนำ 16V)                     | Battery max 4.2V — ใช้ margin 2x+ เสมอ     |
| ESR (electrolytic)        | < 0.5Ω @ 100kHz                       | ESR สูงทำให้ capacitor ร้อนและ ripple สูง  |
| Temperature range         | -40°C ถึง +85°C                       | เหมาะกับ outdoor — อย่าใช้ general purpose |
| Brand แนะนำ               | Panasonic FR series หรือ Nichicon UWT | Low ESR, long lifetime                     |
| Package                   | THT 8×12mm หรือ 6.3×11mm              | ขึ้นกับขนาด PCB — THT บัดกรีง่ายกว่า       |
| LCSC part (470µF/16V THT) | C65129 (Panasonic)                    | Low ESR series                             |
| ราคา                      | ~5 THB/ชิ้น                           |                                            |

> **หมายเหตุ:** วางทั้ง 470µF electrolytic + 10µF ceramic ขนานกัน ที่ VBAT pin SIM7670E — capacitor ใหญ่รับ surge, ceramic ลด noise

## 2.8 Antenna

| Module         | Antenna Type                              | แนะนำ                           | หมายเหตุ                                       |
| -------------- | ----------------------------------------- | ------------------------------- | ---------------------------------------------- |
| SIM7670E (4G)  | External SMA connector                    | Flexible 4G LTE antenna ~50 THB | ยิ่งยาวยิ่งดี signal — แต่ต้องอยู่นอกกล่องโลหะ |
| L76K GPS       | Ceramic patch antenna ในตัว หรือ external | Active GPS antenna ~100 THB     | Active antenna ดีกว่าในพื้นที่โล่ง             |
| ESP32-S3 (BLE) | PCB trace antenna ในตัว                   | ไม่ต้องเพิ่ม                    | ใช้เฉพาะตอน provisioning ระยะสั้น              |

- 4G antenna ต้องยื่นออกนอกกล่องหรือวางบน enclosure ที่ไม่ใช่โลหะ
- GPS antenna ต้องมี clear sky view — ไม่บังด้วยโลหะ
- แนะนำ: เจาะรู antenna ที่ฝาบน enclosure + ใช้ SMA bulkhead connector
- Antenna placement rules: 4G และ GPS ห่างกัน > 2cm ป้องกัน interference

## 2.9 Connector & Cable Specification

| Connector                  | ใช้สำหรับ                 | Spec                             | หมายเหตุ                                                                              |
| -------------------------- | ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| JST PH 2.0mm 2-pin         | DS18B20 probe             | 2A rated, locking                | สีแดง/ดำ — ป้องกันเสียบกลับ                                                           |
| JST PH 2.0mm 4-pin         | Turbidity RS485 (SEN0600) | 2A rated, locking                | 4 pin: VCC, GND, A, B — Phase 2+                                                      |
| JST PH 2.0mm 4-pin         | GPS module                | 2A rated                         | VCC, GND, TX, RX                                                                      |
| SMA female bulkhead        | 4G antenna                | 50Ω impedance                    | ยึดที่ฝา enclosure                                                                    |
| SMA female bulkhead        | GPS antenna               | 50Ω impedance                    | ยึดที่ฝา enclosure                                                                    |
| USB-C female (panel mount) | ชาร์จแบต                  | USB 2.0, 5V/2A rated, IP67 cover | ใช้ waterproof USB-C panel mount พร้อม rubber cap — LCSC C2682115 หรือ Shopee ~50 THB |
| 2-pin screw terminal       | Battery connection        | 2.54mm pitch                     | VCC + GND ของ 18650                                                                   |

- ใช้ JST PH 2.0mm ทุกตัว — pitch เล็กพอ, locking, มาตรฐาน, หาซื้อง่าย
- ทุก connector มี keying (ป้องกันเสียบกลับหัว) — ลูกค้าเปลี่ยน probe เองได้
- สายจาก probe ถึง board ยาว 1.5-2 เมตร — พอสำหรับน้ำลึกทั่วไป
- Strain relief ที่ cable gland ทุกจุดที่สายลอดผ่านกล่อง

## 2.10 EMI & ESD Protection

| จุด                | Protection                 | Component          | เหตุผล                       |
| ------------------ | -------------------------- | ------------------ | ---------------------------- |
| RS485 A/B lines    | TVS diode + ferrite bead   | SMAJ6.5A + BLM18AG | ป้องกัน surge จากสายยาวในน้ำ |
| USB-C input        | ESD protection IC          | USBLC6-2SC6        | ป้องกัน ESD ตอนเสียบชาร์จ    |
| GPS antenna input  | ESD protection             | ESD5Z3.3T1G        | ป้องกัน static discharge     |
| OneWire (DS18B20)  | 100Ω series resistor       | 0402 100Ω          | จำกัด current spike          |
| Power input ทุกจุด | 100nF decoupling capacitor | 0402 100nF         | ลด high-frequency noise      |

> **หมายเหตุ:** สภาพแวดล้อมน้ำเค็ม + ฟ้าผ่า — ควรใส่ TVS diode ที่ RS485 และ antenna inputs ทุกตัว เป็น critical protection

## 2.11 Thermal Management

ESP32-S3 และ SIM7670E สร้างความร้อนระหว่างทำงาน — ต้องจัดการไม่ให้ร้อนเกินใน enclosure ปิด

| Component     | Max Operating Temp | Power Dissipation     | มาตรการ                                        |
| ------------- | ------------------ | --------------------- | ---------------------------------------------- |
| ESP32-S3      | 85°C               | ~800mW (active)       | เพียงพอ — active time สั้นมาก (~5 วินาที/รอบ)  |
| SIM7670E      | 85°C               | ~1.5W (transmit peak) | เพียงพอ — transmit time ~3 วินาที/รอบ          |
| TP4056        | 85°C               | ~500mW (ตอนชาร์จ)     | ระวัง: ตอนชาร์จ 1A อาจร้อน — เพิ่ม thermal pad |
| 18650 Battery | 60°C max           | —                     | อย่าวางชิดกับ TP4056 โดยตรง                    |

- Duty cycle ต่ำมาก (~5 วินาที active ต่อ 5 นาที sleep) → ความร้อนสะสมน้อย
- กล่อง IP67 ปิดสนิท — ต้องแน่ใจว่า thermal budget พอก่อน seal
- ถ้าจำเป็น: เจาะ vent hole + กรองด้วย Gore-Tex membrane (กันน้ำ แต่ระบายอากาศได้)

# 3. Physical Design — ทุ่นลอยน้ำ + ไม้ปัก

## 3.1 Enclosure Specification

| รายการ        | Spec                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| IP Rating     | IP67 self-test target (กันน้ำจุ่มชั่วคราว 1 เมตร 30 นาที)                                                     |
| Material      | ABS+PC UV resistant (ทนแดด)                                                                                   |
| ขนาดประมาณ    | `Standard`: 150 × 100 × 60 mm / `Long-Life`: ใช้ footprint core เดิม แต่เพิ่มความลึกหรือ battery bay ตาม pack ที่เลือก |
| สี            | เทาอ่อน (สะท้อนความร้อน ลดอุณหภูมิภายใน)                                                                      |
| 3D Print      | Prototype ด้วยเครื่องเอง (PETG/ASA) — Production: สั่งร้านรับ print ASA/PC ~400 THB/ชิ้น ไม่ทำ Injection Mold |
| ซีล           | O-ring + Silicone sealant รอบ cable gland                                                                     |
| ซิลิก้าเจล    | 2 ซอง ขนาด 1g ภายในกล่อง — เปลี่ยนทุก 3 เดือน หรือเมื่อเปลี่ยนสีเป็นชมพู                                      |
| Label QR Code | QR code แสดง Device ID + provisioning URL — ติดด้านนอกกล่อง                                                   |
| Label Warning | IP67 / ห้ามเปิดขณะจุ่มน้ำ / ชาร์จ 5V only — ภาษาไทย                                                           |
| Serial number | พิมพ์นูนหรือ laser engrave ที่ฝากล่อง เช่น SB00-001                                                           |

> **หมายเหตุ:** ซิลิก้าเจล: ซื้อแบบ indicating (เปลี่ยนสีเมื่อดูดความชื้นเต็ม) — ราคา ~5 THB/ซอง Shopee — อบฟื้นฟูได้ที่ 150°C นาน 1 ชม.

> **Battery platform note:** enclosure ต้องแยก `core electronics zone` ออกจาก `battery zone` ให้ชัด และถ้าทำรุ่น `Long-Life` ให้เปลี่ยนเฉพาะ battery bay / housing section โดยไม่ย้ายตำแหน่งยึดบอร์ดหลัก, antenna bulkhead, หรือ sensor exits

## 3.1.1 Battery Profile Integration

| Field | ใช้เก็บอะไร | ตัวอย่าง |
| --- | --- | --- |
| `battery_variant` | รุ่นแบตของเครื่อง | `standard`, `long_life` |
| `battery_profile_version` | version ของ profile ที่ใช้คำนวณ | `v1` |
| `usable_capacity_mah` | ความจุ usable ที่ firmware/backend ใช้อ้างอิง | `5600`, `23200` |
| `service_only_upgrade` | ระบุว่าเป็นงานช่าง ไม่ใช่ลูกค้าเปิดเอง | `true` |

- firmware runtime estimator ต้องอ้างอิง `usable_capacity_mah` ตาม `battery_variant`
- dashboard ต้องแสดง battery variant และคำนวณ runtime คงเหลือตาม profile ของเครื่อง
- alert threshold เรื่องแบตควรอ่านจาก profile ไม่ hardcode ชุดเดียวทุก variant

## 3.2 การติดตั้ง — 3 Configuration

SB-00 ออกแบบให้ mounting system เป็น modular — กล่อง MCU ตัวเดียว รองรับได้ 3 configuration ตามความเหมาะสมของพื้นที่

| Configuration         | ประกอบด้วย                           | เหมาะกับ                                    |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| A — ทุ่นลอยอย่างเดียว | กล่อง MCU + ทุ่น + สมอยึด            | บ่อน้ำลึก, ต้องการวัดกลางบ่อ                |
| B — ไม้ปักอย่างเดียว  | กล่อง MCU + ไม้ปัก/เสา PVC + bracket | บ่อน้ำตื้น, ดินแข็ง ปักได้                  |
| C — ไม้ปัก + ทุ่น     | กล่อง MCU + ไม้ปัก + ทุ่นติดเสา      | ต้องการให้เสาคงที่แต่ sensor ลอยตามระดับน้ำ |

### Configuration A — ทุ่นลอยน้ำอย่างเดียว

- กล่อง MCU ติดบน mounting bracket เหนือน้ำ
- ทุ่นโฟม/พลาสติก รองรับน้ำหนักกล่อง + battery
- สาย sensor ห้อยลงไปในน้ำตามความลึกที่ต้องการ
- สายลวดสมอยึดไม่ให้ลอยหนี — ผูกกับหลักหรือขอบบ่อ
- GPS แสดงตำแหน่งทุ่นใน dashboard real-time

### Configuration B — ไม้ปักอย่างเดียว

- ปักไม้/เสา PVC ลงดิน/พื้นบ่อให้แน่น
- กล่อง MCU ยึดกับเสาด้วย bracket สแตนเลส
- ตำแหน่งกล่องอยู่เหนือระดับน้ำสูงสุดอย่างน้อย 30 cm
- Sensor probe ห้อยลงน้ำจากสายที่ผ่าน cable gland — ความลึกปรับได้
- เหมาะกับพื้นที่ที่ระดับน้ำไม่เปลี่ยนมาก

### Configuration C — ไม้ปัก + ทุ่น (แนะนำสำหรับบ่อที่ระดับน้ำขึ้นลง)

- ปักเสา PVC ลงดินเพื่อยึดตำแหน่งไม่ให้เคลื่อน
- กล่อง MCU ยึดกับเสา แต่ติดทุ่นด้วย — กล่องลอยขึ้นลงตามระดับน้ำ
- Sensor probe อยู่ในความลึกคงที่เสมอ ไม่ว่าน้ำจะขึ้นหรือลง
- สายเชื่อมต่อระหว่างกล่องกับเสาต้องมีความยืดหยุ่น (สายหย่อน)
- เหมาะที่สุดสำหรับบ่อน้ำกร่อย/ทะเลที่มีน้ำขึ้นน้ำลง

> **หมายเหตุ:** Mounting hardware ทั้งหมด (ทุ่น, bracket, สมอ) จำหน่ายแยกต่างหากหรือเป็น bundle — ลูกค้าเลือก configuration ตอนสั่งซื้อ

## 3.3 Buoyancy & Weight Calculation

ทุ่นต้องรับน้ำหนักรวมของกล่อง + battery + PCB ได้พร้อม safety margin

| Component                    | น้ำหนักประมาณ              |
| ---------------------------- | -------------------------- |
| Enclosure (ABS/ASA 3D print) | ~120 g                     |
| PCB + components             | ~80 g                      |
| 18650 x2                     | ~100 g                     |
| สาย sensor + connector       | ~50 g                      |
| น้ำหนักรวม                   | ~350 g                     |
| Safety margin 2x             | ~700 g buoyancy ที่ต้องการ |

| ทุ่น                  | Buoyancy        | เหมาะกับ               | ราคาประมาณ   |
| --------------------- | --------------- | ---------------------- | ------------ |
| โฟม EPS 20×20×10 cm   | ~4,000 g (4 kg) | เกินพอ — ราคาถูกที่สุด | ~50 THB      |
| ทุ่นพลาสติก HDPE 25cm | ~2,000 g (2 kg) | พอดี — ทนทานกว่าโฟม    | ~150-300 THB |
| ทุ่น PVC ท่อ DIY      | ปรับได้         | flexible — ทำเองได้    | ~100 THB     |

> **หมายเหตุ:** แนะนำ: โฟม EPS ตัดเป็นแผ่น วางใต้กล่อง MCU — ถูกที่สุด ลอยได้ดี เปลี่ยนง่ายถ้าเสียหาย

## 3.4 Probe Mounting & Depth Adjustment

- สาย probe ลอดผ่าน cable gland PG7 ที่ฝาล่างกล่อง
- ปรับความลึกได้: คลาย cable gland → เลื่อนสายขึ้น/ลง → ขัน cable gland กลับ
- มีเครื่องหมายระดับความลึกทุก 10 cm บนสาย — ช่วยให้ตั้งความลึกได้แม่นยำ
- สาย probe ยาว 1.5 m (default) — เพียงพอสำหรับบ่อทั่วไปที่ลึก < 1 m
- ถ้าต้องการสายยาวกว่า: ต่อ extension cable ผ่าน waterproof connector

| การยึด probe  | วิธี                          | ข้อดี                              |
| ------------- | ----------------------------- | ---------------------------------- |
| ลอยอิสระ      | สายห้อยตรงลงน้ำ               | ง่าย — probe อยู่ความลึกที่ตั้งไว้ |
| ยึดกับน้ำหนัก | ติดน้ำหนักเล็ก (~50g) ปลายสาย | ป้องกัน probe แกว่งในกระแสน้ำ      |
| ยึดกับเสา PVC | ใช้ zip tie ยึด probe กับเสา  | สำหรับ config B/C — ตำแหน่งคงที่   |

## 3.5 Tether & Anchor Spec

| รายการ              | Spec                                       | หมายเหตุ                                      |
| ------------------- | ------------------------------------------ | --------------------------------------------- |
| เชือกสมอ (Config A) | เชือก PE ขนาด 4-6 mm                       | ทนน้ำเค็ม, ไม่เน่า, ราคาถูก — ซื้อที่ตลาดเรือ |
| ความยาวเชือก        | ยาวกว่าความลึกบ่อ 1.5-2 เท่า               | ให้ทุ่นลอยได้โดยไม่ตึงเกิน                    |
| จุดยึด              | หลักไม้/เหล็ก ที่ขอบบ่อ หรือ anchor weight | น้ำหนัก anchor > 2 kg แนะนำ                   |
| Anchor weight       | ก้อนคอนกรีต หรือ เหล็กเส้น > 2 kg          | ทำเองได้จากเศษวัสดุ                           |
| สายสมอ config C     | เชือก PE + สปริง elastic                   | ให้สายหย่อนได้เมื่อน้ำขึ้นลง                  |

## 3.6 Sensor Modularity — ถอดเปลี่ยนได้

> **หมายเหตุ:** หลักการสำคัญ: ลูกค้าเปลี่ยน probe ได้เอง แต่ถ้าจะเพิ่มชนิด sensor ใหม่ ต้องให้ทีมทำ wiring ก่อน

| ระดับ             | ใครทำได้        | ตัวอย่าง                                     |
| ----------------- | --------------- | -------------------------------------------- |
| Probe swap        | ลูกค้าเอง       | เปลี่ยน DS18B20 ตัวเสีย, ถอด-เสียบ connector |
| Sensor type เพิ่ม | ทีมเราทำ wiring | เพิ่ม pH, DO, Salinity — ต้องเดินสายใหม่     |
| Firmware update   | ระยะไกล (OTA)   | เพิ่ม feature, แก้ bug                       |

- ใช้ JST connector มาตรฐานสำหรับ sensor ทุกตัว
- ติดสติ๊กเกอร์สีบน probe แต่ละตัวเพื่อป้องกันเสียบผิด
- Sensor ที่รองรับในอนาคต: pH, DO (Dissolved Oxygen), Salinity, ORP

# 4. Firmware Architecture

## 4.1 Overview

ใช้ ESP-IDF (ไม่ใช่ Arduino) สำหรับ production — ควบคุม power management ได้ละเอียดกว่า, FreeRTOS ในตัว, OTA update ที่ robust

## 4.1.0 Firmware Version Scheme

ใช้ Semantic Versioning (semver) รูปแบบ MAJOR.MINOR.PATCH — เช่น 1.2.3

| ส่วน  | เพิ่มเมื่อ                                                                                                | ตัวอย่าง      |
| ----- | --------------------------------------------------------------------------------------------------------- | ------------- |
| MAJOR | มี breaking change — sensor mapping เปลี่ยน, MQTT payload format เปลี่ยน, ไม่ compatible กับ backend เก่า | 1.x.x → 2.0.0 |
| MINOR | เพิ่ม feature ใหม่ที่ backward compatible — เพิ่ม sensor type, เพิ่ม command ใหม่                         | 1.0.x → 1.1.0 |
| PATCH | แก้ bug, ปรับ parameter, ปรับปรุง stability — ไม่เปลี่ยน behavior                                         | 1.0.0 → 1.0.1 |

| Rule                | รายละเอียด                                                                        |
| ------------------- | --------------------------------------------------------------------------------- |
| Version ใน firmware | กำหนดใน menuconfig หรือ CMakeLists.txt — compile time constant                    |
| Version ใน payload  | ส่งทุก message ใน field fw — server log ไว้สำหรับ analytics                       |
| OTA version check   | device reject OTA ถ้า version ใหม่ต่ำกว่า version ปัจจุบัน (downgrade protection) |
| Version ใน NVS      | เก็บ fw_version ที่ติดตั้งอยู่ — ใช้ compare กับ OTA version                      |
| Dev build           | ใช้ suffix -dev เช่น 1.0.0-dev — ไม่ push OTA ไป production                       |

## 4.1.0.1 Timezone & Timestamp Handling

| รายการ                    | วิธีจัดการ                                                               |
| ------------------------- | ------------------------------------------------------------------------ |
| Timestamp ใน MQTT payload | Unix timestamp UTC เสมอ — ไม่ใช่ local time                              |
| NTP sync                  | sync กับ pool.ntp.org ทุกรอบ AT+CNTP — ได้ UTC                           |
| RTC บน ESP32-S3           | เก็บ UTC — ไม่มี timezone offset ใน firmware                             |
| Dashboard แสดงผล          | แปลง UTC → UTC+7 (Asia/Bangkok) บน frontend — ใช้ user_profiles.timezone |
| Alert timestamp           | เก็บใน DB เป็น TIMESTAMPTZ (UTC) — แสดงผลตาม timezone ของ user           |
| Log / diagnostic          | firmware log เป็น UTC เสมอ — ระบุไว้ใน log ว่า UTC                       |

> **หมายเหตุ:** กฎ: ทุกอย่างใน firmware และ DB เป็น UTC — แปลง timezone เฉพาะตอนแสดงผล UI เท่านั้น ป้องกัน DST confusion

## 4.1.1 Deep Sleep Wakeup Sources

| Wakeup Source      | ใช้เมื่อ                            | Config                                     |
| ------------------ | ----------------------------------- | ------------------------------------------ |
| RTC Timer (หลัก)   | ตื่นทุก interval ที่ตั้งไว้         | esp_sleep_enable_timer_wakeup(interval_us) |
| EXT0 (GPIO wakeup) | ปุ่ม manual wakeup / debug          | GPIO ที่กำหนด — pull-up                    |
| ULP coprocessor    | ถ้าต้องการ wakeup condition ซับซ้อน | Phase 4+ เท่านั้น                          |

- หลัง wakeup: อ่าน wakeup cause ผ่าน esp_sleep_get_wakeup_cause()
- RTC memory เก็บ state ข้าม sleep cycle: crash_count, buf_count, last_lat, last_lng
- GPIO ทุก pin ที่ไม่ใช้ → set เป็น input pull-down ก่อน sleep ลด leakage current

## 4.1.2 NVS Data Structure

NVS (Non-Volatile Storage) เก็บข้อมูลที่ต้องรอดข้ามการ reboot และ power loss

| NVS Namespace | Key                | Type   | เก็บอะไร                                       |
| ------------- | ------------------ | ------ | ---------------------------------------------- |
| config        | interval_sec       | uint32 | interval ที่ลูกค้าตั้ง (วินาที)                |
| config        | night_interval_sec | uint32 | interval กลางคืน                               |
| config        | night_start        | uint8  | ชั่วโมงเริ่ม night mode (0-23)                 |
| config        | night_end          | uint8  | ชั่วโมงสิ้นสุด night mode                      |
| config        | apn                | string | APN override (ถ้ามี)                           |
| calib         | t1_offset          | float  | temperature offset DS18B20                     |
| calib         | tur_clear          | float  | turbidity calibration point 0 NTU              |
| calib         | tur_400            | float  | turbidity calibration point 400 NTU            |
| buffer        | buf_count          | uint16 | จำนวน readings ที่ buffer ค้างอยู่             |
| buffer        | buf_data           | blob   | readings ที่ buffer (binary, max 500 entries)  |
| system        | crash_count        | uint8  | จำนวน crash ติดต่อกัน (safe mode trigger)      |
| system        | fw_version         | string | firmware version ปัจจุบัน                      |
| mqtt          | client_id          | string | MQTT client ID unique ต่อ device               |
| mqtt          | username           | string | MQTT username (encrypted)                      |
| mqtt          | password           | string | MQTT password (encrypted via Flash Encryption) |

## 4.1.3 AT Command Sequence (SIM7670E)

ลำดับ AT command จริงที่ firmware ใช้คุย SIM7670E ทุกรอบ

| ขั้นตอน             | AT Command              | Expected Response | Timeout |
| ------------------- | ----------------------- | ----------------- | ------- |
| 1. ตรวจ modem alive | AT                      | OK                | 2s      |
| 2. ตรวจ SIM         | AT+CPIN?                | +CPIN: READY      | 5s      |
| 3. ตรวจ signal      | AT+CSQ                  | +CSQ: X,0 (X > 5) | 3s      |
| 4. เชื่อม network   | AT+CGATT?               | +CGATT: 1         | 30s     |
| 5. ตั้ง APN         | AT+CGDCONT=1,IP,{apn}   | OK                | 3s      |
| 6. เปิด data        | AT+CGACT=1,1            | OK                | 30s     |
| 7. ตรวจ IP          | AT+CGPADDR=1            | +CGPADDR: 1,{ip}  | 5s      |
| 8. Sync NTP         | AT+CNTP=pool.ntp.org,28 | OK then +CNTP: 1  | 10s     |
| 9. เชื่อม MQTT      | AT+CMQTTSTART / CONNECT | OK                | 15s     |
| 10. Publish         | AT+CMQTTPUB             | OK                | 10s     |
| 11. เข้า PSM        | AT+CPSMS=1,...          | OK                | 3s      |
| 12. ปิด modem       | AT+CPOF                 | NORMAL POWER DOWN | 5s      |

> **หมายเหตุ:** ถ้า step ใดล้มเหลว 3 ครั้งติด → abort รอบนั้น → buffer data ลง NVS → deep sleep รอรอบถัดไป

## 4.1.3.1 GPS Cold Start vs Warm Start

| สถานะ      | Time to First Fix (TTFF) | เมื่อไหร่                                      | Firmware จัดการยังไง                                         |
| ---------- | ------------------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| Cold Start | 30-90 วินาที             | power on ครั้งแรก หรือหลัง battery หมด         | รอ GPS fix สูงสุด 90 วินาที → ถ้าไม่ได้ ส่ง last_lat/lng แทน |
| Warm Start | 5-15 วินาที              | ตื่นจาก deep sleep — almanac ยังอยู่ใน GPS RAM | รอ GPS fix สูงสุด 20 วินาที                                  |
| Hot Start  | < 2 วินาที               | ถ้า GPS RAM ยังมีข้อมูลสด (< 4 ชม.)            | รอสูงสุด 5 วินาที                                            |

- Firmware ส่ง NMEA PMTK command ให้ GPS module ก่อน sleep เพื่อ save almanac — ลด cold start เป็น warm start
- ถ้า GPS ไม่มี fix ภายใน timeout → ส่ง last_lat/lng จาก RTC memory + flag gps_no_fix
- GPS timeout ไม่บล็อก sensor data — อ่าน sensor ไปก่อนระหว่างรอ GPS

## 4.1.3.2 MQTT Reconnect Logic

| สถานการณ์                         | Firmware ทำอะไร                                       | Retry                  |
| --------------------------------- | ----------------------------------------------------- | ---------------------- |
| MQTT connect fail                 | retry 2 ครั้ง (delay 2s) → abort → buffer → sleep     | 2 ครั้ง                |
| MQTT disconnect ระหว่าง publish   | retry publish 1 ครั้ง → reconnect → retry อีก 1 ครั้ง | รวม 2 ครั้ง            |
| MQTT broker unreachable (timeout) | abort ทันที → buffer → sleep ไม่รอนาน                 | ไม่ retry — รอรอบถัดไป |
| Publish ACK timeout (QoS 1)       | retry publish 2 ครั้ง → ถ้ายังไม่ได้ buffer           | 2 ครั้ง                |

> **หมายเหตุ:** ไม่มี infinite retry — ทุก failure path จบด้วย buffer + sleep เพื่อประหยัดแบต

## 4.1.3.3 Config Polling Logic

Firmware รับ config ใหม่จาก server ทุกรอบที่ MQTT connect สำเร็จ — ไม่ต้องรอ trigger พิเศษ

| ขั้นตอน                 | รายละเอียด                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| 1. Subscribe topic      | subscribe aquasense/{id}/command ทันทีหลัง MQTT connect                 |
| 2. รับ pending messages | MQTT persistent session — broker ส่ง messages ที่ค้างมาให้ทันที         |
| 3. Parse command        | ตรวจ command type: set_interval, set_threshold, calibrate, reboot, ota  |
| 4. Validate             | ตรวจ value range — interval ต้องอยู่ใน 5-1800 วินาที เป็นต้น            |
| 5. Apply + save NVS     | update config ใน RAM + เขียนลง NVS ทันที (ไม่รอ reboot)                 |
| 6. ACK                  | publish ไปที่ aquasense/{id}/command/ack พร้อม {status: success/failed} |

## 4.1.4 FreeRTOS Task Structure

| Task Name     | Priority    | Stack Size | Core   | หน้าที่                                                              |
| ------------- | ----------- | ---------- | ------ | -------------------------------------------------------------------- |
| app_main      | 1 (lowest)  | 4KB        | Core 0 | init ทุกอย่าง → spawn tasks → delete ตัวเอง                          |
| sensor_task   | 3           | 4KB        | Core 0 | อ่าน DS18B20, Turbidity (analog/RS485), GPS — block รอ MOSFET stable |
| modem_task    | 4           | 8KB        | Core 1 | AT commands, MQTT connect/publish, NTP sync                          |
| watchdog_task | 5 (highest) | 2KB        | Core 0 | feed TWDT ทุก 10 วินาที — monitor ทุก task                           |
| led_task      | 2           | 2KB        | Core 0 | blink pattern ตาม state ปัจจุบัน                                     |

> **หมายเหตุ:** ใช้ FreeRTOS queue สื่อสารระหว่าง sensor_task → modem_task — ไม่ใช้ global variable เพื่อป้องกัน race condition

## 4.1.5 Memory Usage Estimate

| Memory Type     | Total            | Used (estimate)  | Free      | หมายเหตุ                               |
| --------------- | ---------------- | ---------------- | --------- | -------------------------------------- |
| Flash (8MB)     | 8,192 KB         | ~1,200 KB        | ~7,000 KB | firmware binary + OTA partition + NVS  |
| RAM (512KB)     | 512 KB           | ~180 KB          | ~332 KB   | FreeRTOS tasks + heap + buffers        |
| PSRAM (8MB)     | 8,192 KB         | ~0 KB (ไม่ใช้)   | ~8,192 KB | สำรองสำหรับ future features            |
| NVS Flash       | ~20 KB allocated | ~5 KB            | ~15 KB    | config + calibration + buffer metadata |
| NVS Buffer data | max ~40 KB       | ขึ้นกับ readings | —         | 500 readings × ~80 bytes               |

## 4.1.6 Boot Sequence

ลำดับขั้นตอนตั้งแต่ power on จนถึง first MQTT message

| ขั้นตอน                     | เวลา (ms)  | การทำงาน                                                |
| --------------------------- | ---------- | ------------------------------------------------------- |
| 1. ROM Bootloader           | ~100ms     | hardware init, ตรวจ boot mode (UART/SPI/Normal)         |
| 2. Bootloader (Secure Boot) | ~200ms     | verify firmware signature RSA-3072 — reject ถ้าไม่ผ่าน  |
| 3. Partition Table          | ~50ms      | โหลด partition table, เลือก OTA slot ที่ valid          |
| 4. app_main()               | ~100ms     | init NVS, อ่าน config, init GPIO, เปิด Flash Encryption |
| 5. ตรวจ crash_count         | ~10ms      | ถ้า ≥ 5 → safe mode, ถ้าไม่ → normal mode               |
| 6. Init MOSFET OFF          | ~10ms      | GPIO15 HIGH → sensor ไม่กินไฟ                           |
| 7. Init Watchdog            | ~10ms      | TWDT 30s + MWDT 60s                                     |
| 8. Spawn FreeRTOS tasks     | ~50ms      | sensor_task, modem_task, watchdog_task, led_task        |
| 9. MOSFET ON                | ~10ms      | GPIO15 LOW → จ่ายไฟ sensor                              |
| 10. อ่าน Sensors            | ~2,000ms   | DS18B20 conversion 750ms + Turbidity + GPS              |
| 11. เปิด SIM7670E           | ~3,000ms   | PWRKEY toggle → รอ STATUS → ส่ง AT                      |
| 12. Connect 4G + MQTT       | ~8,000ms   | APN, data, NTP, MQTT connect                            |
| 13. Publish + รับ config    | ~3,000ms   | ส่ง telemetry + poll config ใหม่                        |
| 14. MOSFET OFF + PSM        | ~500ms     | ตัดไฟ sensor + modem PSM                                |
| 15. Deep Sleep              | ~10ms      | set RTC timer → deep sleep                              |
| รวม active time             | ~17 วินาที | ต่อ 1 cycle (@ interval 5 นาที)                         |

## 4.2 Firmware State Machine

| State         | การทำงาน                                                                                     | ระยะเวลา             |
| ------------- | -------------------------------------------------------------------------------------------- | -------------------- |
| DEEP SLEEP    | รอ RTC timer ปลุก — ประหยัดแบตสูงสุด                                                         | 285 วินาที (default) |
| INIT          | ตรวจ state, เปิดไฟ sensor ผ่าน MOSFET                                                        | ~1 วินาที            |
| SENSOR READ   | อ่าน DS18B20, Turbidity (Phase 1: analog ADC / Phase 2+: SEN0600 RS485), อ่าน GPS, battery % | ~2 วินาที            |
| 4G CONNECT    | เชื่อมต่อ 4G, sync NTP, connect MQTT                                                         | ~8 วินาที            |
| SEND / BUFFER | ส่ง MQTT หรือ buffer ลง NVS flash ถ้าไม่มี signal                                            | ~3 วินาที            |
| POWER DOWN    | ปิด sensor MOSFET, modem PSM, กลับ DEEP SLEEP                                                | ~1 วินาที            |

## 4.3 MQTT Payload

JSON payload ที่ device ส่งทุกรอบ:

| Field     | ความหมาย                        | หมายเหตุ                                                             |
| --------- | ------------------------------- | -------------------------------------------------------------------- |
| ts        | Unix timestamp UTC (NTP synced) | เก็บและส่งเป็น UTC เสมอ — dashboard แปลงเป็น UTC+7 ตาม user timezone |
| d         | Device ID                       | เช่น SB00-001                                                        |
| fw        | Firmware version                |                                                                      |
| t1        | อุณหภูมิน้ำ (°C)                | null = sensor fault                                                  |
| tur       | ความขุ่น (NTU)                  | null = sensor fault                                                  |
| lat / lng | GPS coordinates                 | เฉพาะ SB-00                                                          |
| bat       | Battery level (%)               |                                                                      |
| sig       | Signal strength (RSSI dBm)      |                                                                      |
| buf       | จำนวน readings ที่ buffer อยู่  | 0 = ปกติ                                                             |
| qc        | Quality control flag            | null = OK                                                            |

> **หมายเหตุ:** Timezone policy: Device ส่ง Unix timestamp UTC เสมอ — ไม่มี timezone ใน firmware ป้องกัน DST bugs / Backend แปลงเป็น UTC+7 (Asia/Bangkok) ตาม user_profiles.timezone ก่อนแสดงบน dashboard

## 4.4 Interval Config — ลูกค้าตั้งได้ (มีเงื่อนไขควบคุม)

ลูกค้าสามารถตั้งค่า interval การส่งข้อมูลได้จาก Dashboard โดยไม่ต้อง flash firmware ใหม่ แต่ firmware มีเงื่อนไขควบคุมอัตโนมัติเพื่อป้องกันแบตหมดขณะ MCU กำลังทำงาน

### Interval Options

| Interval         | ใช้เมื่อ       | ผลต่อแบต            |
| ---------------- | -------------- | ------------------- |
| 5 วินาที         | Debug / ทดสอบ  | แบตหมดใน ~2 ชม.     |
| 1 นาที           | ติดตามใกล้ชิด  | ~3 วัน              |
| 5 นาที (default) | ใช้งานปกติ     | ≥12 วัน (stretch 14-16 วัน) |
| 15 นาที          | โหมดประหยัดแบต | ~40+ วัน            |
| 30 นาที          | กลางคืน (auto) | ประหยัดแบตอัตโนมัติ |

### Battery-Aware Interval Control (Firmware Override)

Firmware ตรวจสอบระดับแบตจาก MAX17048 ทุกรอบก่อน sleep — ถ้าแบตต่ำกว่า threshold firmware จะ override interval ที่ลูกค้าตั้งไว้อัตโนมัติ เพื่อให้ชุดส่งข้อมูลครบก่อนแบตหมด

| Battery Level     | Firmware Override                             | เหตุผล                                        |
| ----------------- | --------------------------------------------- | --------------------------------------------- |
| > 30% (ปกติ)      | ใช้ interval ที่ลูกค้าตั้ง                    | ปกติ ไม่แทรกแซง                               |
| 15-30% (Low)      | บังคับ interval ≥ 15 นาที                     | ยืด runtime — แจ้งเตือน low battery ผ่าน LINE |
| 10-15% (Critical) | บังคับ interval ≥ 30 นาที                     | ประหยัดแบตสูงสุด — แจ้งเตือน critical battery |
| < 10% (Emergency) | ส่งข้อมูล 1 ครั้งสุดท้าย แล้ว deep sleep ถาวร | ป้องกัน MCU ดับกลางรอบ — รอชาร์จ              |

### Safe Shutdown Logic

เงื่อนไขสำคัญที่สุด: ต้องไม่ให้แบตหมดขณะ MCU กำลัง active (ส่ง 4G, เขียน flash) เพราะจะทำให้ข้อมูลเสียหายหรือ firmware corrupt

| สถานการณ์อันตราย                       | วิธีป้องกัน                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- |
| แบตหมดขณะส่ง 4G                        | ตรวจ battery voltage > 3.4V ก่อนเปิด 4G module — ถ้าต่ำกว่านี้ข้ามการส่ง  |
| แบตหมดขณะเขียน NVS flash               | ตรวจ voltage ก่อน write — ถ้าต่ำกว่า 3.3V ข้าม write และ deep sleep ทันที |
| Voltage drop ขณะ 4G transmit (peak 2A) | Bulk capacitor 470µF รองรับ — ป้องกัน brownout                            |
| แบตหมดแบบกะทันหันจาก load spike        | ESP32 brownout detector (2.6V) → safe reboot อัตโนมัติ                    |

> **หมายเหตุ:** กฎ: ถ้า battery voltage < 3.4V ณ จุดเริ่มรอบ → อ่าน sensor + บันทึก NVS เท่านั้น ไม่เปิด 4G — รอรอบถัดไปที่แบตฟื้นตัว (ถ้าเสียบชาร์จอยู่)

> **หมายเหตุ:** OTA Config: ESP32-S3 poll config จาก server ทุกรอบ → ลูกค้าเปลี่ยน interval แล้ว device รับได้ทันที แต่ firmware override มีผลทันทีถ้าแบตต่ำ

# 5. Pin Assignment (ESP32-S3)

| GPIO       | Function                         | หมายเหตุ                                               |
| ---------- | -------------------------------- | ------------------------------------------------------ |
| GPIO4      | OneWire Bus (DS18B20)            | 4.7kΩ pull-up to V_SNS                                 |
| GPIO5      | I2C SDA (MAX17048 Fuel Gauge)    | Shared I2C bus                                         |
| GPIO6      | I2C SCL (MAX17048 Fuel Gauge)    | Shared I2C bus                                         |
| GPIO9      | UART2 TX → MAX485 DI (RS485)     | Turbidity SEN0600 (Phase 2+) — Phase 1 ใช้ ADC pin แทน |
| GPIO10     | UART2 RX ← MAX485 RO (RS485)     | Turbidity SEN0600 (Phase 2+)                           |
| GPIO11     | MAX485 DE/RE control             | Half-duplex RS485                                      |
| GPIO14     | GPS UART TX                      | GPS Module TX                                          |
| GPIO13     | GPS UART RX                      | GPS Module RX                                          |
| GPIO15     | MOSFET Gate (Sensor + GPS Power) | P-channel SI2301 — Default OFF                         |
| GPIO17     | UART1 TX → SIM7670E RX           | 4G Module                                              |
| GPIO18     | UART1 RX ← SIM7670E TX           | 4G Module                                              |
| GPIO19     | SIM7670E PWRKEY                  |                                                        |
| GPIO20     | SIM7670E STATUS                  |                                                        |
| GPIO48     | Status LED                       | Green/Red bicolor, 330Ω                                |
| GPIO21, 22 | Free (สำรองอนาคต)                | เดิมใช้เป็น I2C แยก                                    |

> **หมายเหตุ:** MOSFET Switch: ใช้ P-channel SI2301 — Default OFF เมื่อ GPIO floating ตอน boot → sensor ไม่กินไฟตอน boot

## 5.2 Voltage Levels & Pull Resistors

| GPIO                 | Voltage Level | Pull Resistor                 | หมายเหตุ                                      |
| -------------------- | ------------- | ----------------------------- | --------------------------------------------- |
| GPIO4 (OneWire)      | 3.3V logic    | 4.7kΩ pull-up to V_SNS (3.3V) | ต้องมี — OneWire ต้องการ pull-up              |
| GPIO5 (I2C SDA)      | 3.3V logic    | 4.7kΩ pull-up to 3.3V         | shared bus — ต้องมี                           |
| GPIO6 (I2C SCL)      | 3.3V logic    | 4.7kΩ pull-up to 3.3V         | shared bus — ต้องมี                           |
| GPIO9 (RS485 TX)     | 3.3V logic    | ไม่ต้องการ                    | MAX485 รับ 3.3V โดยตรง                        |
| GPIO10 (RS485 RX)    | 3.3V logic    | ไม่ต้องการ                    |                                               |
| GPIO11 (RS485 DE/RE) | 3.3V logic    | 100kΩ pull-down to GND        | ป้องกัน floating — default receive mode       |
| GPIO13 (GPS RX)      | 3.3V logic    | ไม่ต้องการ                    |                                               |
| GPIO14 (GPS TX)      | 3.3V logic    | ไม่ต้องการ                    |                                               |
| GPIO15 (MOSFET Gate) | 3.3V logic    | 100kΩ pull-up to 3.3V         | P-channel — HIGH = OFF (default safe)         |
| GPIO17 (4G TX)       | 3.3V logic    | ไม่ต้องการ                    | SIM7670E รับ 3.3V                             |
| GPIO18 (4G RX)       | 3.3V logic    | ไม่ต้องการ                    |                                               |
| GPIO19 (PWRKEY)      | 3.3V logic    | 10kΩ pull-up to 3.3V          | active LOW — pull-up ป้องกัน accidental power |
| GPIO48 (LED)         | 3.3V logic    | 330Ω series ต่อ LED           | จำกัด current ~10mA                           |

> **หมายเหตุ:** ESP32-S3 GPIO ทุกขา 3.3V logic, 5V tolerant บาง pin — ตรวจสอบ datasheet ก่อนต่อสัญญาณ 5V โดยตรง

## 5.3 ESP32-S3 Strapping Pins — ระวัง!

ESP32-S3 มี strapping pins ที่อ่านค่าตอน boot — ถ้าต่อ external circuit ผิดจะทำให้ boot ผิด mode หรือ boot ไม่ขึ้น

| GPIO   | Strapping Function | ค่าที่ต้องการ                           | ข้อควรระวัง                                                           |
| ------ | ------------------ | --------------------------------------- | --------------------------------------------------------------------- |
| GPIO0  | Boot mode select   | HIGH = normal boot, LOW = download mode | ต้องการ 10kΩ pull-up — ถ้าต่อ LOW ค้างจะ boot เป็น download mode ตลอด |
| GPIO46 | ROM messages log   | HIGH = print, LOW = silent              | ปกติปล่อยลอย (internal pull-down) — ไม่ต้องต่ออะไร                    |
| GPIO3  | JTAG control       | HIGH = enable JTAG                      | ปกติปล่อยลอย — ถ้าต้องการ disable JTAG ต่อ 10kΩ pull-down             |
| GPIO45 | VDD_SPI voltage    | LOW = 3.3V (ต้องการ)                    | ห้ามต่อ HIGH — จะทำให้ SPI flash ทำงานผิดพลาด                         |

> **หมายเหตุ:** สรุป: GPIO0 ต้องมี 10kΩ pull-up to 3.3V บน PCB — GPIO45, 46, 3 ปล่อยลอยหรือต่อตาม use case เท่านั้น ห้ามต่อ signal อื่น

# 12. Sensor Calibration

## 12.1 DS18B20 Temperature

DS18B20 มี factory calibration แม่นยำ ±0.5°C ไม่ต้อง calibrate ใหม่สำหรับ production ปกติ

### การ Verify ก่อนส่งมอบ

- จุ่ม probe ทุกตัวในน้ำเดียวกัน อุณหภูมิเดียวกัน
- ค่าที่อ่านได้ต้องต่างกันไม่เกิน 0.5°C — ถ้าต่างมากกว่านี้ probe เสีย
- ทดสอบในน้ำแข็งละลาย (0°C) เป็น reference

### Offset Calibration (ถ้าต้องการความแม่นยำสูงกว่า)

1. จุ่ม probe ในน้ำแข็งละลาย (0°C reference)
1. บันทึก offset ของแต่ละตัว เช่น probe อ่านได้ 0.3°C → offset = -0.3
1. เก็บ offset ใน NVS flash per device
1. Firmware ลบ offset ก่อนส่งค่า

## 12.2 Turbidity Calibration

### Phase 1 — Analog Turbidity Sensor

> **หมายเหตุ:** Analog sensor ไม่มี standard NTU output — calibrate ด้วย voltage mapping เท่านั้น ใช้สำหรับ dev/test ไม่ใช่ค่าอ้างอิงที่เชื่อถือได้

- จุ่ม probe ในน้ำกลั่น → บันทึก voltage เป็น V_clear
- จุ่ม probe ในน้ำขุ่นจากบ่อ → บันทึก voltage เป็น V_turbid
- Firmware map voltage range เป็นค่า NTU ประมาณ (ไม่แม่นยำ)
- เพียงพอสำหรับทดสอบ pipeline: sensor → MQTT → cloud → dashboard

### Phase 2+ — DFRobot SEN0600 (RS485 Production)

> **หมายเหตุ:** SEN0600 มี built-in signal conditioning ตามมาตรฐาน ISO 7027 drift น้อยกว่า analog มาก แต่ยังต้อง calibrate เพราะเลนส์เกิดคราบ biofilm — MVP ใช้น้ำโคลนจากบ่อแทน Formazin เพื่อประหยัดต้นทุน ความแม่นยำเพียงพอสำหรับบ่อหอยแครง

### 2-Point Calibration

| จุด                      | วิธี                                                               | บันทึก  |
| ------------------------ | ------------------------------------------------------------------ | ------- |
| Point 1 — น้ำใส (0 NTU)  | ใช้น้ำกลั่น/น้ำ RO                                                 | R_clear |
| Point 2 — น้ำขุ่นมาตรฐาน | ใช้น้ำโคลนจากบ่อจริง หรือ Formazin 400 NTU ถ้าต้องการความแม่นยำสูง | R_400   |

สูตร: NTU = 400 × (R_read - R_clear) / (R_400 - R_clear)

### Calibration Schedule

- ก่อนติดตั้ง: Full 2-point calibration ทุกเครื่อง
- ทุก 2 สัปดาห์: ทำความสะอาดเลนส์ กด recalibrate ใน dashboard (zero-point)
- ทุก 3 เดือน: Full 2-point calibration ใหม่ (ผู้ใช้ทำเองตามคู่มือ)

### Remote Calibration

- Dashboard ส่ง command calibrate_turbidity device อ่าน RS485 50 ครั้ง แล้วเฉลี่ย
- ACK กลับพร้อมค่า R_clear เดิม vs ใหม่
- Server log calibration event ลง calibration_log table
- Auto-drift detection: ถ้า baseline เพิ่มต่อเนื่อง 7 วัน แจ้งเตือน ควรทำความสะอาด sensor

# 13. Data Validation & Quality Control

## 13.1 Device-side Validation (Firmware)

| Validation                 | Rule                                  | Action เมื่อ fail            |
| -------------------------- | ------------------------------------- | ---------------------------- | -------------------- | ------------------------------- |
| Range Check — Temperature  | -5°C ถึง 50°C                         | ส่ง null + flag sensor_fault |
| Range Check — Turbidity    | 0-1000 NTU                            | ส่ง null + flag sensor_fault |
| Range Check — Battery      | 0-100%                                | log error                    |
| Rate-of-Change — Temp      |                                       | Delta                        | ≤ 3°C ต่อ 5 นาที     | ส่งค่าจริง + flag rate_exceeded |
| Rate-of-Change — Turbidity |                                       | Delta                        | ≤ 300 NTU ต่อ 5 นาที | ส่งค่าจริง + flag rate_exceeded |
| Stuck Value                | ค่าเดิมทุกประการ 10 รอบติด            | flag stuck_sensor            |
| DS18B20 = 85.0°C           | ค่า default เมื่อ conversion ไม่เสร็จ | ทิ้งค่า รอ conversion ใหม่   |

## 13.2 Server-side Validation Pipeline

| ขั้นตอน             | ตรวจอะไร                                      |
| ------------------- | --------------------------------------------- |
| 1. Schema check     | JSON structure ถูกต้อง fields ครบ             |
| 2. Device auth      | device_id มีใน DB webhook signature ถูกต้อง   |
| 3. Timestamp check  | ts ไม่เก่ากว่า 48 ชม. ไม่อยู่ในอนาคต > 5 นาที |
| 4. Duplicate check  | ts + device_id ไม่ซ้ำใน Redis (TTL 10 นาที)   |
| 5. Range check      | ซ้ำกับ firmware (defense in depth)            |
| 6. Store            | Supabase INSERT + Redis SET latest values     |
| 7. Alert evaluation | ตรวจ alert rules สำหรับ device นี้            |

## 13.3 Outlier Handling (Dashboard)

- ใช้ Moving Z-Score: คำนวณ mean + std จาก 24 ค่าล่าสุด (2 ชม.)
- ถ้า |value - mean| > 3 sigma flag เป็น outlier
- Dashboard แสดง outlier เป็นจุดสีแดง + tooltip อธิบาย
- ไม่ลบ outlier ออกจาก DB เก็บไว้แต่ mark ไว้

# 14. OTA Firmware Update

## 14.1 Overview

ใช้ ESP-IDF native OTA — Dual partition (app0/app1) รองรับ rollback อัตโนมัติถ้า update ล้มเหลว

## 14.2 OTA Flow

| ขั้นตอน           | การทำงาน                                                        |
| ----------------- | --------------------------------------------------------------- |
| 1. Server trigger | Dashboard ส่ง command ota_update พร้อม URL ของ firmware binary  |
| 2. Device receive | Device รับ command ผ่าน MQTT topic aquasense/{id}/command       |
| 3. Download       | Device download firmware ผ่าน HTTPS flash ลง inactive partition |
| 4. Verify         | ตรวจ checksum + signature (RSA-3072)                            |
| 5. Reboot         | Device reboot เข้า partition ใหม่                               |
| 6. Validation     | ถ้า boot สำเร็จ mark as valid และส่ง status กลับ                |
| 7. Rollback       | ถ้า boot ล้มเหลว rollback อัตโนมัติไป partition เดิม            |

> **หมายเหตุ:** Firmware binary ต้อง sign ด้วย RSA-3072 key เดียวกับที่ burn ใน Secure Boot เก็บ signing key ใน hardware security module

# 15. Device Provisioning

## 15.1 MVP — QR Code + Web

| ขั้นตอน          | การทำงาน                                                       |
| ---------------- | -------------------------------------------------------------- |
| 1. Factory flash | Flash firmware (signed) + config เริ่มต้น + burn eFuse ตอนผลิต |
| 2. QR Code       | ติด QR code บนกล่อง encode device_id + provisioning token      |
| 3. ลูกค้า scan   | ลูกค้า scan QR ด้วยมือถือ เปิดหน้า web provisioning            |
| 4. ลงทะเบียน     | กรอกชื่อฟาร์ม ตำแหน่ง server ผูก device กับ farm               |
| 5. Device online | Device boot เชื่อมต่อ MQTT ส่งข้อมูลทันที                      |

## 15.2 BLE Provisioning Status

- `BLE provisioning` ไม่เป็นส่วนหนึ่งของ customer flow สำหรับ MVP และ pilot ในเอกสาร v1.1
- ถ้าทีมต้องการทดลอง ให้ถือเป็น internal R&D หลังจาก `QR Code + Web/PWA` flow หลักนิ่งแล้วเท่านั้น
- ห้ามออกคู่มือ, training, หรือ support script ที่ทำให้ลูกค้าเข้าใจว่ามีมากกว่าหนึ่ง provisioning flow
- งานโรงงาน/QC/recovery ยังใช้ `factory USB / QC tool` ได้ตามเดิม

# 19. Production QC Checklist

> **หมายเหตุ:** ใช้เวลา ~20 นาที/เครื่อง — ต้องผ่านทุกข้อก่อนส่งมอบ

## 19.1 Visual Inspection

| #   | รายการตรวจ                                 | ผล          |
| --- | ------------------------------------------ | ----------- |
| 1   | PCB สะอาด บัดกรีดี ไม่มี solder bridge     | Pass / Fail |
| 2   | Bulk capacitor 470uF ที่ VBAT pin > 400uF  | Pass / Fail |
| 3   | Enclosure ไม่มีรอยแตก O-ring อยู่ในร่อง    | Pass / Fail |
| 4   | Cable gland ขันแน่น ซีลด้วย silicone       | Pass / Fail |
| 5   | Serial number + QR code ติดถูกต้อง         | Pass / Fail |
| 6   | อุปกรณ์ครบ (เครื่อง สาย คู่มือ ซิลิก้าเจล) | Pass / Fail |

## 19.2 Electrical & Firmware Test

| #   | รายการตรวจ                                                | ผล          |
| --- | --------------------------------------------------------- | ----------- |
| 7   | Battery voltage 3.7-4.2V, 3.3V rail ±5%                   | Pass / Fail |
| 8   | Sensor test: อ่านค่าได้ทั้งหมด (จุ่มในน้ำห้อง)            | Pass / Fail |
| 9   | Temperature accuracy: probe ต่างกัน < 0.5°C ในน้ำเดียวกัน | Pass / Fail |
| 10  | RS485 turbidity (SEN0600): Modbus OK, CRC pass            | Pass / Fail |
| 11  | Turbidity 2-point calibration สำเร็จ                      | Pass / Fail |
| 12  | GPS fix ได้ใน 3 นาที (outdoor)                            | Pass / Fail |
| 13  | 4G test: SIM register OK, MQTT connect + send OK          | Pass / Fail |
| 14  | NTP sync: เวลาตรงกับ reference ±2 วินาที                  | Pass / Fail |
| 15  | Deep sleep current < 2mA                                  | Pass / Fail |
| 16  | OTA test: รับ + flash firmware สำเร็จ                     | Pass / Fail |
| 17  | Flash encryption: eFuse burned, NVS encrypted             | Pass / Fail |

## 19.3 Water & Environmental Test

| #   | รายการตรวจ                                     | ผล          |
| --- | ---------------------------------------------- | ----------- |
| 18  | IP67 seal check กดปิดฝาแน่น ดูด้วยตา           | Pass / Fail |
| 19  | จุ่มน้ำ 30 นาที @ 1 เมตร ตรวจภายในไม่มีน้ำ     | Pass / Fail |
| 20  | ทดสอบในน้ำเค็ม 3.5% NaCl sensor อ่านค่าได้ปกติ | Pass / Fail |
| 21  | ทดสอบ floating ทุ่นลอยได้ กล่องอยู่เหนือน้ำ    | Pass / Fail |

# 25. Supported Device Commands

คำสั่งทั้งหมดที่ Dashboard สามารถส่งไปยัง device ได้ผ่าน MQTT topic aquasense/{device_id}/command

| Command             | Params                                   | การทำงาน                                         |
| ------------------- | ---------------------------------------- | ------------------------------------------------ |
| set_interval        | interval_sec: number                     | เปลี่ยน reading/sending interval (ลูกค้าตั้งได้) |
| reboot              | -                                        | restart device                                   |
| ota_update          | url: string, version: string             | trigger OTA firmware update                      |
| calibrate_turbidity | type: zero_point / two_point             | calibrate turbidity sensor                       |
| sleep_schedule      | night_interval_sec, start_hour, end_hour | ลดความถี่ช่วงกลางคืน                             |
| read_now            | -                                        | อ่านค่า sensor และส่งทันที                       |
| dump_log            | -                                        | ส่ง error log จาก NVS                            |
| read_raw            | -                                        | อ่าน raw sensor values + OneWire scan            |
| modem_info          | -                                        | ส่งข้อมูล modem: IMEI, ICCID, operator, signal   |
| debug_mode          | duration_min: number                     | ส่งทุก 1 นาที + raw values ตามเวลาที่กำหนด       |
| set_apn             | apn, username, password                  | override APN settings                            |
| map_sensors         | -                                        | re-scan OneWire bus + re-map sensor addresses    |
| set_threshold       | sensor, min, max                         | ตั้ง soft threshold บน device (local alert)      |
| safe_mode_clear     | -                                        | ล้าง crash_count reset จาก safe mode กลับ normal |

> **หมายเหตุ:** ทุก command มี id (UUID) และ ts — device ต้อง ACK กลับผ่าน topic aquasense/{id}/command/ack พร้อม status: success / failed

# 26. PCB Schematic & Circuit Details

## 26.1 Block Diagram

| Block         | Component                                           | เชื่อมต่อกับ        | Interface                                    |
| ------------- | --------------------------------------------------- | ------------------- | -------------------------------------------- |
| MCU           | ESP32-S3 WROOM-1                                    | ทุกอย่าง            | —                                            |
| 4G Modem      | SIMCom A7670E (production default) / SIM7670E fallback | ESP32-S3         | UART1 (GPIO17/18)                            |
| GPS           | L76K (default) / NEO-M8N fallback                   | ESP32-S3            | UART2 (GPIO13/14)                            |
| Temperature   | DS18B20 x1                                          | ESP32-S3            | OneWire (GPIO4)                              |
| Turbidity     | Phase 1: Analog Sensor / Phase 2+: SEN0600 + MAX485 | ESP32-S3            | Phase 1: ADC / Phase 2+: UART2 (GPIO9/10/11) |
| Fuel Gauge    | MAX17048                                            | ESP32-S3            | I2C (GPIO5/6)                                |
| Sensor Switch | SI2301 P-ch MOSFET                                  | GPIO15              | Gate control                                 |
| Charger       | TP4056                                              | Battery, USB-C      | —                                            |
| LDO           | AP2112K-3.3                                         | Battery → 3.3V rail | —                                            |
| Protection    | DW01 + FS8205A                                      | Battery             | —                                            |
| Status LED    | Bicolor Green/Red                                   | GPIO48              | 330Ω resistor                                |

## 26.2 Power Supply Path

- Battery 3.7V → TP4056 (charging via USB-C) + DW01 (protection: over-discharge 2.5V, overcharge 4.2V, short-circuit)
- Battery 3.7V → AP2112K-3.3 LDO (quiescent 55µA) → 3.3V rail สำหรับ ESP32-S3 + sensors
- Battery 3.7V → SIM7670E โดยตรง (ต้องการ peak current 2A ที่ LDO รับไม่ไหว) ผ่าน regulator ภายในโมดูล
- Bulk capacitor 470µF electrolytic + 10µF ceramic ที่ VBAT pin ของ SIM7670E — ป้องกัน brownout ตอน transmit
- Decoupling: 100µF + 100nF ที่ input LDO, 10µF + 100nF ที่ output

## 26.3 MOSFET Sensor Power Switch

ใช้ P-channel MOSFET (SI2301) ตัดไฟ sensor ทั้งหมดตอน deep sleep

| สถานะ GPIO15                     | MOSFET | ผล                                   |
| -------------------------------- | ------ | ------------------------------------ |
| HIGH (3.3V) หรือ floating (boot) | OFF    | sensor ไม่กินไฟ — default safe state |
| LOW (0V)                         | ON     | sensor ได้รับไฟ 3.3V (V_SNS)         |

- SI2301 specs: Rds(on) = 0.11Ω, max current 2.3A — เหลือเฟือสำหรับ sensor รวม ~50mA
- Gate resistor: 10kΩ series + 100kΩ pull-up to 3.3V — ป้องกัน floating
- Sensor ที่ถูกตัดไฟ: DS18B20, Turbidity sensor (analog/SEN0600), MAX485, GPS module

## 26.4 RS485 Interface

| Signal                | ESP32-S3         | MAX485 Pin | หมายเหตุ                   |
| --------------------- | ---------------- | ---------- | -------------------------- |
| TX (Data to sensor)   | GPIO9            | DI         | UART2 TX                   |
| RX (Data from sensor) | GPIO10           | RO         | UART2 RX                   |
| Direction Control     | GPIO11           | DE + RE    | HIGH=transmit, LOW=receive |
| Power                 | V_SNS (switched) | VCC        | ตัดไฟได้ตอน sleep          |
| RS485 A/B             | —                | A, B       | ต่อไป SEN0600 (Phase 2+)   |

- Half-duplex RS485 — GPIO11 ควบคุมทิศทาง
- Termination resistor 120Ω ที่ปลายสาย RS485 — ถ้าสายยาว > 1 เมตร
- V_SNS จ่ายไฟทั้ง MAX485 + SEN0600 — ตัดไฟรวมกันตอน sleep

## 26.5 I2C Bus

| Device                | I2C Address | GPIO SDA | GPIO SCL |
| --------------------- | ----------- | -------- | -------- |
| MAX17048 (Fuel Gauge) | 0x36        | GPIO5    | GPIO6    |

- Pull-up resistors: 4.7kΩ to 3.3V บน SDA และ SCL
- GPIO21, GPIO22 สำรองไว้สำหรับ sensor เพิ่มเติมในอนาคต

## 26.6 Component Footprint Reference

| Component                | Package / Footprint        | หมายเหตุ                            |
| ------------------------ | -------------------------- | ----------------------------------- |
| ESP32-S3 WROOM-1         | SMD 18×25.5mm stamp hole   | ขนาดใหญ่ — วางกลาง PCB              |
| SIM7670E module          | SMD 24×24mm stamp hole     | วางใกล้ antenna connector           |
| AP2112K LDO              | SOT-25 (5-pin)             | ขนาดเล็ก — ระวัง orientation        |
| MAX17048                 | TDFN-1x1 (8-pin)           | ขนาดเล็กมาก — ต้องการ paste stencil |
| SI2301 MOSFET            | SOT-23 (3-pin)             |                                     |
| TP4056 Charger           | SOP-8                      |                                     |
| DW01A Protection         | SOT-23-6                   |                                     |
| FS8205A Dual MOSFET      | SOT-23-6                   | คู่กับ DW01A                        |
| MAX485 RS485             | SOP-8                      |                                     |
| Resistors (pull-up/down) | 0402                       | ขนาดเล็ก เพียงพอสำหรับ hand solder  |
| Capacitors (decoupling)  | 0402                       | 100nF, 10µF                         |
| Bulk Capacitor 470µF     | Through-hole 6.3×11mm      | ตัวใหญ่ — วางชิด VBAT SIM7670E      |
| JST PH 2.0 connector     | Through-hole หรือ SMD      | sensor connectors                   |
| SMA bulkhead             | Panel mount                | เจาะรูที่ enclosure                 |
| USB-C                    | SMD 16-pin                 | ต้องการ precise placement           |
| LED (bicolor)            | 0805 หรือ 3mm through-hole |                                     |

## 26.7 PCB Stack-up & Design Rules (JLCPCB Standard)

### Stack-up (2-layer)

| Layer               | Material         | Thickness | หมายเหตุ                   |
| ------------------- | ---------------- | --------- | -------------------------- |
| Top Copper (L1)     | 1 oz copper      | 35µm      | signal + component layer   |
| Core (FR4)          | FR4              | 1.2mm     | standard thickness         |
| Bottom Copper (L2)  | 1 oz copper      | 35µm      | ground plane ทั้งหมด       |
| Surface finish      | HASL (lead-free) | —         | ราคาถูก พอสำหรับ prototype |
| Solder mask         | Green (default)  | —         | ด้านบนและล่าง              |
| Silkscreen          | White            | —         | component labels           |
| Board thickness รวม | 1.6mm            | —         | standard                   |

### Design Rules (JLCPCB 2-layer Standard)

| Rule                  | Minimum  | แนะนำ                | หมายเหตุ                    |
| --------------------- | -------- | -------------------- | --------------------------- |
| Trace width (signal)  | 0.1mm    | 0.2mm                | 0.2mm ง่ายต่อ manufacture   |
| Trace width (power)   | 0.1mm    | 0.5-1.0mm            | power rail ควรกว้าง         |
| Trace clearance       | 0.1mm    | 0.2mm                | ระหว่าง trace ต่างๆ         |
| Via drill             | 0.2mm    | 0.3mm                |                             |
| Via annular ring      | 0.13mm   | 0.2mm                |                             |
| Copper to edge        | 0.2mm    | 0.3mm                |                             |
| Solder mask expansion | 0.05mm   | 0.1mm                |                             |
| Min hole size (drill) | 0.2mm    | 0.3mm                | สำหรับ through-hole         |
| Impedance control     | 50Ω ±10% | สำหรับ antenna trace | ต้องการ stackup calculation |

> **หมายเหตุ:** Antenna trace 50Ω: ใน 2-layer FR4 1.6mm กับ copper 1oz — trace width ~2.8mm สำหรับ microstrip — คำนวณด้วย KiCad impedance calculator ก่อน route

## 26.8 PCB Layout Guidelines

- 2-layer PCB เพียงพอ — Top layer: signal + components, Bottom layer: ground plane
- ขนาดประมาณ 80 × 60 mm — พอดีในกล่อง 150×100×60mm พร้อมช่องว่าง
- Ground plane ด้านล่างทั้งหมด ไม่ตัด — ลด EMI + noise
- แยก RS485 section ออกจาก sensitive analog (fuel gauge) ด้วย ground moat
- SIM7670E antenna trace: 50Ω microstrip ~2.8mm — ไม่มี via บน trace
- Bulk capacitor 470µF วางชิด VBAT pin ของ SIM7670E < 5mm
- Decoupling 100nF วางชิด VCC pin ทุก IC < 2mm
- Mounting holes 4 มุม M3 — clearance จาก copper > 1mm
- Connector headers แทนบัดกรีสายตรง — ซ่อมง่าย ประกอบในโรงงานง่าย
- Test points ทุก critical net — TP1-TP6 + TP_GND (ดู 26.9)

## 26.7 Production Test Points

| Test Point | ตรวจอะไร               | ค่าที่ต้องได้                          |
| ---------- | ---------------------- | -------------------------------------- |
| TP1        | Battery voltage        | 3.2-4.2V                               |
| TP2        | 3.3V rail              | 3.3V ±5%                               |
| TP3        | V_SNS (sensor power)   | 3.3V เมื่อ ON, 0V เมื่อ OFF            |
| TP4        | UART TX (to 4G modem)  | Logic level signal 3.3V                |
| TP5        | OneWire bus            | Pull-up 3.3V, pulse เมื่ออ่าน sensor   |
| TP6        | RS485 A/B differential | ~200mV idle, ±1.5V ระหว่าง communicate |
| TP_GND     | Ground reference       | 0V                                     |

## 26.8 Enclosure Specification

ใช้ 3D print (PETG หรือ ASA) สำหรับ prototype — enclosure ออกแบบให้ board ถอดเข้าออกได้ง่าย

| Spec             | ค่า                                         | หมายเหตุ                                           |
| ---------------- | ------------------------------------------- | -------------------------------------------------- |
| ขนาดภายนอก       | ล็อกที่ 150×100×60mm สำหรับ PCB v1 และ pilot batch | optimize หลัง pilot เท่านั้นถ้า field data บังคับ |
| ความหนาผนัง      | 3 mm                                        | พอสำหรับ structural + IP67                         |
| วัสดุ prototype  | PETG หรือ ASA                               | ASA ทนแดด UV ดีกว่า เหมาะ outdoor                  |
| วัสดุ production | ASA หรือ PC จากร้านรับ print                | ~400 THB/ชิ้น                                      |
| การกันน้ำ        | IP67 self-test target                       | target สำหรับ pilot batch — lab certification ทำภายหลัง |
| Seal method      | Silicone O-ring + silicone sealant          | ทาเพิ่มรอบ O-ring ทุกครั้ง                         |
| Screw            | M3 x 4 ตัว สแตนเลส                          | ยึดฝาบน-ล่าง                                       |
| Cable gland      | PG7 (สำหรับสาย 3-6mm)                       | 1-2 ตัวต่อกล่อง ขึ้นกับ config                     |
| USB-C port       | USB-C female + rubber dust cap กันน้ำ IP67  | ปิด cap เมื่อไม่ชาร์จ — ถ้าเปิด cap จะไม่ผ่าน IP67 |
| Antenna port     | SMA bulkhead connector x2                   | 4G + GPS — ยึดแน่น กันน้ำ                          |
| Mounting holes   | M3 x 4 มุม (ภายใน)                          | สำหรับยึด PCB กับ standoff                         |

## 26.9 Waterproof Seal Procedure

ขั้นตอนการ seal ที่ถูกต้องสำคัญมากสำหรับ IP67 — ทำผิดขั้นตอนทำให้น้ำเข้าได้

1. ทำความสะอาดพื้นผิว O-ring groove ด้วย isopropyl alcohol 70% — รอแห้งสนิท
1. ทา silicone grease บาง ๆ บน O-ring ทุกด้าน — ช่วย compress สม่ำเสมอ
1. วาง O-ring ในร่อง — ไม่บิด ไม่ยืด
1. ทา silicone sealant (Dowsil 732 หรือเทียบเท่า) รอบ O-ring อีกชั้น
1. ประกอบฝา — ขันสกรู M3 แบบ cross pattern ทีละน้อย ไม่ขันแน่นทีเดียว
1. รอ silicone sealant แห้ง 24 ชั่วโมงก่อนทดสอบน้ำ
1. IP67 self-test: จุ่มน้ำจืด 1 เมตร 30 นาที — เปิดตรวจภายใน

> **หมายเหตุ:** ต้อง re-seal ทุกครั้งที่เปิดกล่อง — silicone sealant ใช้ได้ครั้งเดียว ต้องทาใหม่ทุกครั้ง

### IP67 Self-Test Checklist (หลัง seal)

| ขั้นตอน               | วิธี                                                     | Pass Criteria                |
| --------------------- | -------------------------------------------------------- | ---------------------------- |
| Visual check ก่อนจุ่ม | ตรวจ O-ring ไม่มีรอยบาก, silicone ทาสม่ำเสมอ, สกรูขันครบ | ไม่มีรอยฉีก ไม่มีช่องว่าง    |
| จุ่มน้ำ               | จุ่มในน้ำจืดลึก 1 เมตร — วัดด้วยไม้บรรทัด/เชือก          | กล่องต้องจมถึง 1 เมตร        |
| รอ 30 นาที            | ไม่ต้องทำอะไร — รอให้ครบ                                 | ไม่มีฟองอากาศออกมาจากกล่อง   |
| เปิดตรวจ              | เช็ดน้ำภายนอก → เปิดฝา → ตรวจภายใน                       | ไม่มีน้ำหยดหรือไอน้ำภายใน    |
| ตรวจ PCB              | ดู PCB ใต้แสง — ตรวจ oxidation หรือ water mark           | PCB แห้งสนิท ไม่มี corrosion |
| Power on test         | เปิดเครื่อง ตรวจ LED + MQTT connection                   | ทำงานปกติ                    |

## 26.10 JLCPCB BOM — LCSC Part Numbers

รายการ component พร้อม LCSC part number สำหรับสั่ง JLCPCB SMT Assembly

| Component           | Value/Model          | Package  | LCSC Part | ราคาประมาณ/ชิ้น |
| ------------------- | -------------------- | -------- | --------- | --------------- |
| ESP32-S3 WROOM-1    | 8MB Flash/8MB PSRAM  | Module   | C2913202  | ~120 THB        |
| AP2112K-3.3         | 3.3V LDO 600mA       | SOT-25   | C89358    | ~3 THB          |
| MAX17048            | Fuel Gauge           | SOT-23-6 | C82148    | ~15 THB         |
| SI2301              | P-MOSFET             | SOT-23   | C10487    | ~2 THB          |
| MAX485              | RS485 Transceiver    | SOP-8    | C385843   | ~5 THB          |
| DW01A               | Battery Protection   | SOT-23-6 | C351231   | ~3 THB          |
| FS8205A             | Dual N-MOSFET        | SOT-23-6 | C916030   | ~3 THB          |
| TP4056              | Li-ion Charger       | SOP-8    | C382139   | ~3 THB          |
| Capacitor 470µF/16V | Electrolytic THT     | 6.3×11mm | C65129    | ~5 THB          |
| Capacitor 100µF/10V | Electrolytic THT     | 5×11mm   | C252534   | ~3 THB          |
| Capacitor 10µF/10V  | Ceramic X5R          | 0805     | C19702    | <1 THB          |
| Capacitor 100nF     | Ceramic X7R          | 0402     | C307331   | <1 THB          |
| Resistor 4.7kΩ      | Pull-up              | 0402     | C25900    | <1 THB          |
| Resistor 10kΩ       | Pull-up/down         | 0402     | C25744    | <1 THB          |
| Resistor 100kΩ      | Pull-up              | 0402     | C25803    | <1 THB          |
| Resistor 330Ω       | LED series           | 0402     | C25104    | <1 THB          |
| Resistor 100Ω       | Series protection    | 0402     | C25076    | <1 THB          |
| Resistor 120Ω       | RS485 termination    | 0402     | C25087    | <1 THB          |
| TVS SMAJ6.5A        | ESD/surge protection | SMA      | C8545     | ~3 THB          |
| LED bicolor         | Green/Red status     | 3mm THT  | ซื้อในไทย | ~3 THB          |

| Component                          | Value/Model         | Package            | แหล่งซื้อ                     | ราคาประมาณ/ชิ้น |
| ---------------------------------- | ------------------- | ------------------ | ----------------------------- | --------------- |
| A7670E (production default) / SIM7670E fallback | LTE Cat 1 4G module | LCC68 / Stamp hole | LCSC C5198236 หรือ AliExpress | ~180 THB        |
| GPS L76K (default)                              | GNSS module UART    | Stamp hole         | LCSC C5284605 หรือ AliExpress | ~150 THB        |
| GPS NEO-M8N (fallback ถ้าต้องการแม่นยำกว่า)    | u-blox GNSS         | Module             | AliExpress                    | ~400-500 THB    |

> **หมายเหตุ:** production BOM ให้ยึด `A7670E + L76K` เป็นชุด default ก่อน และค่อยสลับไป `SIM7670E` หรือ `NEO-M8N` เมื่อ supply chain หรือ field test บังคับจริงเท่านั้น

## 26.11 Gerber Export Checklist (ก่อนส่ง JLCPCB)

1. Export Gerber files ครบ: GTL (top copper), GBL (bottom copper), GTS (top soldermask), GBS (bottom soldermask), GTO (top silkscreen), GBO (bottom silkscreen), TXT (drill file)
1. ตรวจ DRC (Design Rule Check) ใน KiCad → ต้องไม่มี error ก่อน export
1. ตรวจ via drill size ≥ 0.4mm ทุกตัว — JLCPCB standard
1. ตรวจ trace width ≥ 0.127mm — แนะนำ 0.2mm+
1. ตรวจ clearance ≥ 0.127mm ทุกจุด
1. ตรวจ board edge (Edge.Cuts layer) ปิดครบ — ไม่มีช่องว่าง
1. ตรวจ component orientation บน silkscreen — pin 1 ทุกตัวชัดเจน
1. ตรวจ SIM7670E antenna clearance — ไม่มี copper ใน keepout zone
1. Preview Gerber ผ่าน gerbv หรือ JLCPCB online preview ก่อน order
1. Export BOM (CSV) + CPL (component placement list) สำหรับ PCBA
1. ตรวจ BOM: LCSC part numbers ถูกต้องทุกตัว quantity ตรงกับ schematic

## 26.12 Assembly Process

1. ประกอบ PCB — บัดกรี component ทุกตัว (หรือใช้ JLCPCB PCBA)
1. ติดตั้ง standoff M3 x 10mm ที่ 4 มุมในกล่อง
1. วาง PCB บน standoff + ขันสกรู M3
1. ต่อสาย antenna 4G + GPS กับ SMA bulkhead
1. ใส่ battery + ต่อสาย — ตรวจ polarity ก่อนเสมอ
1. เดินสาย probe DS18B20 + Turbidity sensor (SEN0600) ผ่าน cable gland
1. ขัน cable gland ให้แน่น + ตรวจ strain relief
1. ทำ waterproof seal ตามขั้นตอน 26.9
1. Power on + ตรวจ LED status + ทดสอบ MQTT connection
1. IP67 self-test ก่อน ship
