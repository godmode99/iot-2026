# SB-00 AquaSense IoT — รายการจัดซื้อ

**Version 1.1 | March 2026 | Confidential**

---

# สรุปงบประมาณทั้งหมด

| Phase                           | ระยะเวลา                    | งบ (THB) | รายการหลัก                                          |
| ------------------------------- | --------------------------- | -------- | --------------------------------------------------- |
| Phase 1 — Prototype & Full Test | Apr - Jun 2026 (10 สัปดาห์) | ~18,400  | 3D Printer, dev board, sensors, tools, materials    |
| Phase 2 — PCB Development       | Jun - Aug 2026 (8 สัปดาห์)  | ~4,000   | PCB x3 version, components 1 ชุด                    |
| Phase 3 — Commercial Launch     | Sep - Oct 2026 (8 สัปดาห์)  | ~4,300   | PCB batch, components, 3D print 2 ชิ้น, setup       |
| ยังไม่รวม                       | เมื่อพร้อม                  | ~25,000+ | กสทช. (~15,000), Marketing, IP67 lab test (~10,000) |
| รวม Phase 1-3                   | Apr - Oct 2026              | ~26,700  |                                                     |

> **หมายเหตุ:** หมายเหตุ: ราคาที่ระบุเป็นค่าประมาณ — ควรตรวจสอบราคาจริงก่อนสั่งซื้อ ราคา component อาจเปลี่ยนตามตลาด

> **หมายเหตุ:** เป้าหมาย: ทดสอบทุก function บน FS-HCore dev board จนครบ รวม firmware, sensor, waterproof, GPS — ก่อนทำ PCB เลย

## 1.1 เครื่องมือ & อุปกรณ์ (ลงทุนครั้งเดียว)

| รายการ                                   | สเปค / รุ่นแนะนำ                                                                                                                                                  | จำนวน                     | ราคา/หน่วย (THB) | รวม (THB)                        | แหล่งซื้อ                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------- | -------------------------------- | ------------------------------------------------ |
| 3D Printer                               | Creality Ender 3 V3 KE หรือ Bambu Lab A1 Mini — FDM, build volume ≥ 220×220×250mm, รองรับ PETG และ ASA, มี heated bed ≥ 60°C                                      | 1                         | 8,000-12,000     | 10,000                           | Shopee / Lazada / ร้านตัวแทน                     |
| Filament PLA (ทดสอบ layout)              | PLA 1.75mm 1kg — สีใดก็ได้ ใช้ print ทดสอบรูปทรงก่อน                                                                                                              | 1 ม้วน                    | 350-500          | รวมในราคา Printer                | Shopee / JAYO / Bambu                            |
| Filament PETG (waterproof test)          | PETG 1.75mm 1kg — สีเทาหรือขาว ทดสอบ waterproof                                                                                                                   | 1 ม้วน                    | 400-600          | รวมในราคา Printer                | Shopee / eSUN                                    |
| Multimeter                               | Digital multimeter auto-ranging — วัด DC voltage 0-50V, current 0-10A, resistance, continuity — เช่น Uni-T UT61E หรือ Fluke 101                                   | 1                         | 400-800          | 500                              | Shopee / บางลำพู                                 |
| Logic Analyzer                           | USB Logic Analyzer 8-channel 24MHz — รองรับ OneWire, I2C, SPI, UART, RS485 — เช่น Saleae clone หรือ Cypress                                                       | 1                         | 300-600          | 500 (clone) หรือ 1,200 (branded) | Shopee / AliExpress                              |
| Soldering Iron (เอใช้)                   | Temperature-controlled 200-480°C — เช่น TS100/TS101 หรือ Hakko FX-888D clone — พล ไม่ต้องใช้ (บัดกรีไม่เป็น) — เอใช้ประกอบ hardware ทั้งหมด                       | 1 ชุด                     | 400-800          | 500                              | Shopee / บางลำพู                                 |
| Breadboard + jumper wires                | Breadboard 830 จุด + jumper wire M-M/M-F/F-F 40 เส้น/ชุด — พล 1 ชุด (ทดสอบ firmware) + เอ 1 ชุด (ทดสอบ hardware)                                                  | 2 ชุด                     | 300-500          | 700                              | Shopee / AliExpress                              |
| Hot glue gun + silicone sealant          | Hot glue gun 20-40W พร้อม glue stick 20 แท่ง + Silicone sealant (Dowsil 732 หรือ Selleys neutral cure) 100g                                                       | 1 ชุด                     | 400-500          | 500                              | ร้านฮาร์ดแวร์ / Shopee                           |
| Wire Stripper + Crimping Plier           | Wire stripper สำหรับ 22-28 AWG + JST PH 2.0mm crimping plier (Engineer PA-09 หรือ clone) — จำเป็นสำหรับ crimp JST connector ทำสาย probe เอง                       | 1 ชุด                     | 300-800          | 500                              | Shopee / บางลำพู — Engineer PA-09 clone ~300 THB |
| Flush Cutter / Diagonal Plier            | Flush cutter (คีมตัดขาแบบหน้าเรียบ) — ตัดขา THT component, ตัดสาย, ตัด zip tie ให้เรียบ — ราคาถูกก็พอสำหรับงานนี้                                                 | 1                         | 80-200           | 150                              | Shopee / บางลำพู                                 |
| Helping hands / PCB holder               | Third hand tool สำหรับจับชิ้นงานระหว่างบัดกรี — เพิ่มความแม่นยำลด mistake                                                                                         | 1                         | 150-300          | 200                              | Shopee / บางลำพู                                 |
| Tweezers ปากแหลม ESD-safe (เอใช้)        | ESD-safe tweezers สำหรับ handle SMD — พล ไม่ต้องใช้ — เอใช้ตอน PCB assembly Phase 2                                                                               | 1 คู่ (straight + curved) | 80-200           | 150                              | Shopee / AliExpress                              |
| Solder Wire 63/37 (เอใช้)                | Solder wire 0.6-0.8mm — พล ไม่ต้องใช้ — เอใช้ประกอบ PCB + sensor connector                                                                                        | 1 ม้วน (100g)             | 80-150           | 100                              | Shopee / บางลำพู                                 |
| Flux Paste (เอใช้)                       | No-clean flux paste หรือ flux pen — พล ไม่ต้องใช้ — เอใช้ประกอบ SMD                                                                                               | 1                         | 80-200           | 120                              | Shopee / บางลำพู                                 |
| Isopropyl Alcohol (IPA) 70-99%           | IPA 99% ดีที่สุด — ทำความสะอาด PCB หลังบัดกรี (ล้าง flux residue) + เช็ด O-ring groove ก่อน seal + เช็ด connector — ขวด 100-500ml                                 | 1 ขวด (250ml)             | 80-150           | 100                              | ร้านขายยา (70%) / Shopee (99%)                   |
| ESD Wrist Strap                          | Anti-static wrist strap + grounding cord — ป้องกัน static discharge ทำลาย ESP32-S3, MAX17048 และ SMD ICs — จำเป็นโดยเฉพาะอากาศแห้ง                                | 1                         | 50-150           | 80                               | Shopee / AliExpress                              |
| USB to TTL Serial Adapter (CP2102/CH340) | USB to UART adapter 3.3V/5V selectable — ใช้ debug firmware + monitor serial output — CP2102 หรือ CH340G — ต้องเลือก 3.3V mode สำหรับ ESP32-S3                    | 1                         | 60-150           | 80                               | Shopee / AliExpress                              |
| Breadboard Power Supply Module 5V/3.3V   | Breadboard power supply module — input USB หรือ 6-12V DC — output 5V และ 3.3V switchable — MB102 type หรือเทียบเท่า — จ่ายไฟ sensor บน breadboard แยกจาก FS-HCore | 1                         | 40-100           | 60                               | Shopee / AliExpress                              |

## 1.2 Development Board & Modules

| รายการ                                     | สเปค / รุ่นแนะนำ                                                                                                                                                   | จำนวน | ราคา/หน่วย (THB) | รวม (THB) | แหล่งซื้อ                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------- | --------- | -------------------------------------------- |
| FS-HCore-A7670C Dev Board                  | ESP32-S3 + SIM7670C LTE Cat 1 บนบอร์ดเดียว — รองรับ Band 1/3/5/8 (AIS/TRUE/DTAC) — มี SIM card slot, USB-C, GPIO header ครบ — ใช้แทน PCB custom ใน Phase 1 ทั้งหมด | 1     | 550              | 550       | Shopee (ค้นหา 'FS-HCore A7670') / AliExpress |
| SIM Card IoT (AIS)                         | AIS IoT SIM — ทดสอบ PSM mode + data speed + Band 1/3 — ซื้อแบบรายเดือน เริ่มต้น                                                                                    | 1     | 50-100           | 70        | ร้าน AIS / Shopee AIS Official               |
| SIM Card IoT (TRUE)                        | TRUE Move H IoT SIM — ทดสอบ Band 1/3/8 เปรียบเทียบ                                                                                                                 | 1     | 50-100           | 70        | ร้าน TRUE / Shopee TRUE Official             |
| SIM Card IoT (DTAC/NT)                     | DTAC หรือ NT SIM — ทดสอบ Band 3/5                                                                                                                                  | 1     | 50-100           | 60        | ร้าน DTAC / NT                               |
| GPS Module L76K                            | Quectel L76K GNSS — UART 9600bps, 3.3V, TTFF cold < 60s warm < 15s — พล 1 ชิ้น + เอ 1 ชิ้น                                                                         | 2     | 130-180          | 300       | LCSC C5194780 / AliExpress / Shopee          |
| MAX17048 Fuel Gauge Module                 | MAX17048 breakout module — I2C address 0x36, 3.3V — พล 1 ชิ้น (ทดสอบ battery monitoring) + เอ 1 ชิ้น (hardware จริง)                                               | 2     | 50-100           | 160       | Shopee / LCSC C82148 (IC เปล่า)              |
| SMA Pigtail Cable (IPX/u.FL to SMA Female) | Pigtail cable IPX/u.FL to SMA female — ยาว 10-15cm — สำหรับต่อ antenna connector บน FS-HCore กับ SMA bulkhead หรือ antenna ภายนอก                                  | 2     | 30-60            | 80        | Shopee / AliExpress                          |
| MT3608 Step-up Boost Module 3.3V→5V        | MT3608 boost converter — input 3.3V output 5V 2A — สำหรับจ่ายไฟ turbidity sensor (Phase 1: analog / Phase 2+: SEN0600) — พล 1 ชิ้น + เอ 1 ชิ้น                     | 2     | 30-60            | 80        | Shopee / AliExpress                          |
| Logic Level Shifter 3.3V↔5V                | Bidirectional logic level shifter 4-channel — 3.3V ↔ 5V — พล 1 ชิ้น + เอ 1 ชิ้น                                                                                    | 2     | 20-50            | 60        | Shopee / AliExpress / LCSC                   |

> **หมายเหตุ:** Turbidity sensor power: Phase 1 ใช้ analog turbidity sensor (~413 THB, Shopee) จ่ายไฟ 5V ผ่าน MT3608 / Phase 2+ ใช้ SEN0600 RS485 (~913 THB, DigiKey) ต้องการ supply 5-12V — ใช้ MT3608 step-up จาก VBAT 3.7V → 5V

## 1.3 Sensors

| รายการ                                                       | สเปค / รุ่นแนะนำ                                                                                                                                                                         | จำนวน | ราคา/หน่วย (THB) | รวม (THB) | แหล่งซื้อ                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------- | --------- | ---------------------------------- |
| DS18B20 Waterproof Temperature Probe                         | DS18B20 แบบ waterproof สาย 1 เมตร — IP68, range -55°C ถึง +85°C, accuracy ±0.5°C, OneWire protocol, 3-wire (VCC/GND/DATA) — พล 1 ชิ้น (breadboard) + เอ 1 ชิ้น (hardware) + สำรอง 1 ชิ้น | 3     | 60-100           | 200       | Shopee / AliExpress / LCSC C727469 |
| Analog Turbidity Sensor (Phase 1 Dev/Test)                   | Analog turbidity sensor — output 0-4.5V, supply 5V — ใช้ทดสอบ firmware pipeline เท่านั้น ไม่ใช่ production sensor — พล 1 ชิ้น (breadboard) + เอ 1 ชิ้น (hardware)                        | 2     | 400-450          | 826       | Shopee                             |
| DFRobot SEN0600 Turbidity Sensor RS485 (Phase 2+ Production) | DFRobot SEN0600 — RS485 Modbus RTU, ISO 7027, range 0-1000 NTU, วัดทั้ง turbidity + temperature, supply 5-12V — สั่งล่วงหน้าตอนเริ่ม Phase 2 lead time ~9 สัปดาห์                        | 2     | ~913             | 1,827     | DigiKey (1738-SEN0600-ND)          |
| MAX485 RS485 Transceiver Module                              | MAX485 หรือ SP3485 breakout module — half-duplex, 3.3V compatible — พล 1 ชิ้น + เอ 1 ชิ้น                                                                                                | 2     | 15-30            | 40        | Shopee / AliExpress / LCSC C385843 |

## 1.4 Power & Battery

| รายการ                            | สเปค / รุ่นแนะนำ                                                                                                                                                                  | จำนวน | ราคา/หน่วย (THB) | รวม (THB) | แหล่งซื้อ                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------- | --------- | ------------------------------------------ |
| 18650 Li-ion Battery              | Samsung INR18650-35E 3,500mAh หรือ Panasonic NCR18650B 3,400mAh — ซื้อจากร้านที่ verified ไม่ซื้อ generic ไม่มียี่ห้อ — ตรวจสอบ capacity จริงด้วย battery tester ก่อนใช้          | 2     | 100-150          | 250       | Shopee (ร้าน Official / Verified) / Lazada |
| 18650 Battery Holder 2S Parallel  | Battery holder แบบ parallel (ขนาน) 2 ก้อน — output เป็น 3.7V nominal — มีสาย JST หรือ bare wire, ขนาด fit 18650 ได้พอดี                                                           | 1     | 50-80            | 60        | Shopee / AliExpress                        |
| TP4056 Charging Module with USB-C | TP4056 module พร้อม protection (DW01+FS8205A) — input USB-C 5V — charge current 1A (RPROG 1.2kΩ) — มี indicator LED — ตรวจสอบว่ามี protection circuit ด้วย ไม่ใช่แค่ TP4056 เปล่า | 1     | 40-80            | 50        | Shopee / AliExpress                        |
| USB-C Cable (ชาร์จทดสอบ)          | USB-C to USB-A หรือ USB-C to USB-C 1 เมตร — 5V/2A minimum                                                                                                                         | 1     | 50-100           | 50        | Shopee / ร้านทั่วไป                        |

## 1.5 Passive Components & Connectors

| รายการ                        | สเปค / รุ่นแนะนำ                                                                                                                     | จำนวน | ราคา (THB) | แหล่งซื้อ               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------- | ----------------------- |
| Resistor Kit                  | 0402 SMD resistor kit — ค่าที่ต้องการ: 100Ω, 330Ω, 1kΩ, 4.7kΩ, 10kΩ, 100kΩ — อย่างน้อย 20 ชิ้น/ค่า หรือซื้อ kit ครบชุด               | 1 kit | 150-300    | Shopee / LCSC / บางลำพู |
| Capacitor Kit                 | 0402 + THT capacitor — 100nF ceramic (0402), 10µF ceramic (0805), 100µF/10V electrolytic (THT), 470µF/16V electrolytic Low-ESR (THT) | 1 kit | 150-300    | Shopee / LCSC / บางลำพู |
| JST PH 2.0mm Connector Kit    | JST PH 2.0mm — 2-pin และ 4-pin — male+female คู่ละ 10 คู่ขึ้นไป — พร้อม crimping plier หรือซื้อแบบมีสายสำเร็จ                        | 1 kit | 80-150     | Shopee / AliExpress     |
| Dupont/jumper wire assortment | Male-Male, Male-Female, Female-Female 20cm — 40 เส้น/ชนิด                                                                            | 1 ชุด | 50-100     | Shopee / AliExpress     |
| Heat shrink tubing            | ชุด heat shrink หลายขนาด 2mm-8mm สีดำ — ใช้คลุมจุด solder                                                                            | 1 ชุด | 50-80      | Shopee / บางลำพู        |
| Zip tie นิรภัย                | Zip tie ขนาด 100mm และ 200mm — สีดำ UV resistant                                                                                     | 1 ถุง | 30-50      | ร้านฮาร์ดแวร์ / Shopee  |
| สายไฟ 22-24 AWG               | สายไฟ stranded 22AWG สีต่างๆ (แดง ดำ เหลือง เขียว) — ม้วนละ 10 เมตร                                                                  | 4 สี  | 30-50/ม้วน | บางลำพู / Shopee        |

> **หมายเหตุ:** ราคารวม passive components ทั้งหมดประมาณ ~800-1,000 THB — ซื้อที่ LCSC ถูกกว่าแต่ต้องรอ shipping, ซื้อที่บางลำพูหรือ Shopee ได้เร็วกว่า

## 1.6 Waterproof & Enclosure Materials

| รายการ                        | สเปค / รุ่นแนะนำ                                                                                                 | จำนวน            | ราคา (THB)  | แหล่งซื้อ                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- | ----------- | ------------------------------- |
| Cable Gland PG7               | PG7 nylon cable gland — thread M12, สาย 3-6.5mm — กันน้ำ IP68 — ซื้อ nylon ไม่ซื้อ plastic ถูก (แตกง่าย)         | 5                | 10-20/ชิ้น  | Shopee / ร้านไฟฟ้า              |
| Silicone Sealant Neutral Cure | Dowsil 732 RTV หรือ Selleys Roof & Gutter neutral cure — ห้ามใช้ acetic acid (กลิ่นน้ำส้ม) เพราะกัดทองแดง        | 1 หลอด (90-100g) | 100-150     | HomePro / Global House / Shopee |
| O-ring EPDM หรือ NBR          | O-ring ขนาด 2.5mm cross-section — เส้นผ่านศูนย์กลางให้ตรงกับขนาดกล่องที่ออกแบบ — ซื้อ EPDM (ทนน้ำเค็มดีกว่า NBR) | 1 ชุด (10 ชิ้น)  | 50-100      | Shopee / ร้านยาง                |
| Silicone Grease               | Silicone grease สำหรับ O-ring — เช่น Molykote 111 หรือ ทั่วไป 100g — ทาบน O-ring ก่อน seal                       | 1 กระป๋อง        | 80-150      | Shopee / ร้านยาง                |
| Silica Gel Indicating 2g      | Silica gel 2g สีน้ำเงิน indicating type — เปลี่ยนสีเป็นชมพู/ขาวเมื่ออิ่มตัว — ซื้อเผื่อไว้ 50-100 ซอง            | 50 ซอง           | ~50 THB รวม | Shopee                          |
| M3 Stainless Steel Screw      | M3×8mm stainless steel Phillips head — ยึดฝากล่อง — สแตนเลสไม่เป็นสนิมในน้ำเค็ม                                  | 20               | 1-3/ชิ้น    | Shopee / ร้านน็อต               |
| M3 Brass Standoff             | M3 brass standoff 10mm female-female — สำหรับยึด PCB ในกล่อง                                                     | 4                | 5-10/ชิ้น   | Shopee / LCSC                   |
| น้ำกลั่น (turbidity cal)      | น้ำกลั่น 1 ลิตร — ใช้เป็น reference 0 NTU สำหรับ calibrate turbidity sensor                                      | 1 ลิตร           | 30-50       | ร้านขายยา / Shopee              |

> **หมายเหตุ:** ราคารวมหมวด waterproof materials ประมาณ ~600-800 THB

## 1.7 Antenna & RF

| รายการ                        | สเปค / รุ่นแนะนำ                                                                                                                       | จำนวน | ราคา (THB) | แหล่งซื้อ                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- | -------------------------- |
| 4G LTE Antenna                | Flexible 4G LTE antenna — SMA male connector — frequency 700-2700MHz (ครอบคลุม Band 1/3/5/8/28) — cable ยาว 10-15cm หรือ adhesive type | 1     | 40-80      | Shopee / AliExpress        |
| GPS Active Antenna            | GPS active antenna — SMA male connector — 3.3V patch antenna — cable 15-20cm — ใช้กับ L76K ที่ต้องการ external antenna                 | 1     | 60-120     | Shopee / AliExpress / LCSC |
| SMA Female Bulkhead Connector | SMA female bulkhead panel mount — สำหรับยึดที่ enclosure — กันน้ำ IP67 — 2 ตัว (4G + GPS)                                              | 2     | 20-40/ชิ้น | Shopee / LCSC C709050      |
| SMA Male to SMA Female Cable  | Pigtail SMA Male to SMA Female — RG174 coax — ยาว 10-15cm — ใช้ต่อ module กับ bulkhead connector                                       | 2     | 30-60/ชิ้น | Shopee / AliExpress        |

> **หมายเหตุ:** ราคารวมหมวด antenna ประมาณ ~300-400 THB

## 1.8 Domain & Digital

| รายการ                   | สเปค                                                                                                                       | ราคา (THB/ปี)    | แหล่งซื้อ                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------- |
| Domain name              | aquasense.io หรือ .co.th — ตรวจสอบ availability ก่อน — ซื้อผ่าน Cloudflare Registrar หรือ Namecheap ราคาถูกและไม่มี markup | ~500-800/ปี      | Cloudflare Registrar / Namecheap |
| HiveMQ Cloud (Free tier) | Free plan — 100 connections, unlimited messages — ไม่ต้องจ่ายใน Phase 1                                                    | 0                | hivemq.com                       |
| Vercel (Hobby Free)      | Free plan — ไม่ต้องจ่ายใน Phase 1                                                                                          | 0                | vercel.com                       |
| Supabase (Free tier)     | Free plan — 500MB DB — ไม่ต้องจ่ายใน Phase 1                                                                               | 0                | supabase.com                     |
| Upstash QStash           | Pay-per-use — ~$4/เดือน เริ่มจ่ายตั้งแต่วันแรก                                                                             | ~144/เดือน (~$4) | upstash.com                      |

> **หมายเหตุ:** แนวทาง Phase 1: พล ทดสอบ firmware logic บน ESP32-S3 DevKit + breadboard — เอ ทดสอบ hardware จริงบน FS-HCore-A7670C พร้อม sensor ประกอบ — ทำ parallel ได้โดยไม่รอกัน เพราะพลบัดกรีไม่เป็น ทั้งคู่ใช้ sensor คนละชุด

> **หมายเหตุ:** ค่า SaaS รายเดือนที่ต้องจ่ายตั้งแต่ Phase 1: Upstash QStash ~144 THB/เดือน + Domain ~500-800 THB/ปี

## 1.9 สรุปงบ Phase 1

**รวมทั้งหมด Phase 1: ~19,326 THB** (ฮาร์ดแวร์ พล ~3,363 + เอ ~15,963) + ค่า digital ~1,082 (domain + QStash 3 เดือน)

| หมวด                                                  | พล (THB)   | เอ (THB)    | รวม (THB)   | หมายเหตุ                                                    |
| ----------------------------------------------------- | ---------- | ----------- | ----------- | ----------------------------------------------------------- |
| Dev Board & Modules                                   | ~550       | ~930        | ~1,480      | พล: DevKit + modules / เอ: FS-HCore + modules + SMA pigtail |
| Sensors (DS18B20, Analog Turbidity, MAX485)           | ~513       | ~593        | ~1,106      | พลคนละ 1 ชิ้น / เอมี DS18B20 สำรอง +1                       |
| 3D Printer + Filament                                 | 0          | ~10,000     | ~10,000     | เอซื้อ ลงทุนครั้งเดียว                                      |
| เครื่องมือ (multimeter, logic analyzer, USB-TTL, ESD) | ~1,160     | 0           | ~1,160      | พลสั่งเอง                                                   |
| เครื่องมือบัดกรี + assembly                           | 0          | ~1,720      | ~1,720      | เอสั่งทั้งหมด — พลไม่บัดกรี                                 |
| Breadboard + passive components                       | ~730       | ~680        | ~1,410      | คนละชุด                                                     |
| Power & Battery                                       | ~410       | 0           | ~410        | พลทดสอบ deep sleep / battery อยู่ฝั่งเอตอน field test       |
| Antenna & RF                                          | 0          | ~290        | ~290        | เอสั่งทั้งหมด — งาน RF/enclosure                            |
| Waterproof & Enclosure                                | 0          | ~535        | ~535        | เอสั่งทั้งหมด — งาน assembly                                |
| Connectors & Wiring                                   | 0          | ~440        | ~440        | เอสั่งทั้งหมด — งาน wiring                                  |
| SIM Cards                                             | 0          | ~200        | ~200        | เอสั่ง — ใช้กับ FS-HCore                                    |
| น้ำกลั่น                                              | 0          | ~40         | ~40         | เอสั่ง — calibration กับ hardware จริง                      |
| Hot glue + silicone                                   | 0          | ~500        | ~500        | เอสั่ง — waterproof test                                    |
| Domain name                                           | ~650       | 0           | ~650        | พลจัดการ — ใช้ตลอด project                                  |
| Upstash QStash (3 เดือน)                              | ~432       | 0           | ~432        | พลจัดการ — ~144/เดือน                                       |
| **รวม**                                               | **~4,445** | **~15,928** | **~20,373** |                                                             |

> **หมายเหตุ:** งบรวม Phase 1 ต่ำกว่า estimate เดิม (~24,410) เพราะแยกของชัดเจนขึ้น ไม่ซื้อซ้ำซ้อน — ตัวเลขอาจเปลี่ยนตามราคาจริงตอนสั่ง

## 1.10 รายการสั่งซื้อ Phase 1 แยกตามคน

> **หมายเหตุ:** พลไม่บัดกรี — ทดสอบ firmware logic บน ESP32-S3 DevKit + breadboard เท่านั้น สั่งเฉพาะของที่จำเป็น / เอรับผิดชอบ hardware ทั้งหมด ต้องมีของครบ

### พล — Firmware + Backend (ทดสอบบน breadboard ไม่บัดกรี)

| หมวด       | รายการ                                    | จำนวน    | ราคาประมาณ (THB) |
| ---------- | ----------------------------------------- | -------- | ---------------- |
| Dev Board  | ESP32-S3 DevKit                           | 1        | 250              |
| Modules    | GPS L76K                                  | 1        | 150              |
| Modules    | MAX17048 Fuel Gauge Module                | 1        | 80               |
| Modules    | MT3608 Step-up 3.3V→5V                    | 1        | 40               |
| Modules    | Logic Level Shifter 3.3V↔5V               | 1        | 30               |
| Sensor     | DS18B20 Waterproof Probe                  | 1        | 80               |
| Sensor     | Analog Turbidity Sensor                   | 1        | 413              |
| Sensor     | MAX485 RS485 Module                       | 1        | 20               |
| Breadboard | Breadboard 830 จุด                        | 1        | 200              |
| Breadboard | Jumper wire M-M/M-F/F-F                   | 1 ชุด    | 80               |
| Breadboard | Breadboard PSU (MB102)                    | 1        | 50               |
| Breadboard | Resistor kit (4.7kΩ, 10kΩ, 100kΩ ฯลฯ)     | 1 kit    | 200              |
| Breadboard | Capacitor kit (100nF, 10µF, 100µF, 470µF) | 1 kit    | 200              |
| เครื่องมือ | Multimeter                                | 1        | 500              |
| เครื่องมือ | Logic Analyzer USB 8ch                    | 1        | 500              |
| เครื่องมือ | USB-TTL Adapter (CP2102/CH340)            | 1        | 80               |
| เครื่องมือ | ESD Wrist Strap                           | 1        | 80               |
| Power      | 18650 Li-ion Battery                      | 2        | 250              |
| Power      | 18650 Battery Holder 2S Parallel          | 1        | 60               |
| Power      | TP4056 Charging Module USB-C              | 1        | 50               |
| Power      | USB-C Cable                               | 1        | 50               |
| Digital    | Domain name                               | 1        | 650/ปี           |
| Digital    | Upstash QStash                            | รายเดือน | 144/เดือน        |
|            | **รวมพล (ฮาร์ดแวร์)**                     |          | **~3,363**       |
|            | **รวมพล (ฮาร์ดแวร์ + digital 3 เดือน)**   |          | **~4,445**       |

> **หมายเหตุ:** พลไม่ต้องสั่ง: SIM cards (ต้องใช้กับ FS-HCore ของเอ), antenna + SMA bulkhead (งาน RF/enclosure ของเอ), waterproof materials (งาน assembly ของเอ), เครื่องมือบัดกรีทั้งหมด (solder wire, flux, tweezers, flush cutter, helping hands), JST connector kit + heat shrink + สายไฟม้วน (งาน wiring ของเอ), น้ำกลั่น (calibration ทำกับ hardware จริงของเอ)

### เอ — Hardware + Assembly (บัดกรี + ประกอบ + ทดสอบ hardware ทั้งหมด)

| หมวด             | รายการ                                            | จำนวน  | ราคาประมาณ (THB) |
| ---------------- | ------------------------------------------------- | ------ | ---------------- |
| Dev Board        | FS-HCore-A7670C                                   | 1      | 550              |
| Modules          | GPS L76K                                          | 1      | 150              |
| Modules          | MAX17048 Fuel Gauge Module                        | 1      | 80               |
| Modules          | MT3608 Step-up 3.3V→5V                            | 1      | 40               |
| Modules          | Logic Level Shifter 3.3V↔5V                       | 1      | 30               |
| Modules          | SMA Pigtail Cable (u.FL to SMA)                   | 2      | 80               |
| Sensor           | DS18B20 Waterproof Probe (×1 + สำรอง ×1)          | 2      | 160              |
| Sensor           | Analog Turbidity Sensor                           | 1      | 413              |
| Sensor           | MAX485 RS485 Module                               | 1      | 20               |
| SIM              | SIM Card IoT AIS                                  | 1      | 70               |
| SIM              | SIM Card IoT TRUE                                 | 1      | 70               |
| SIM              | SIM Card IoT DTAC/NT                              | 1      | 60               |
| 3D Printer       | 3D Printer (Creality/Bambu) + Filament PLA + PETG | 1 ชุด  | 10,000           |
| Breadboard       | Breadboard 830 จุด + jumper wire                  | 1 ชุด  | 280              |
| เครื่องมือบัดกรี | Soldering Iron                                    | 1      | 500              |
| เครื่องมือบัดกรี | Solder Wire 63/37                                 | 1 ม้วน | 100              |
| เครื่องมือบัดกรี | Flux Paste                                        | 1      | 120              |
| เครื่องมือบัดกรี | Tweezers ESD-safe                                 | 1 คู่  | 150              |
| เครื่องมือบัดกรี | Flush Cutter                                      | 1      | 150              |
| เครื่องมือบัดกรี | Helping hands / PCB holder                        | 1      | 200              |
| เครื่องมือบัดกรี | Wire Stripper + Crimping Plier                    | 1 ชุด  | 500              |
| เครื่องมือ       | IPA 99%                                           | 1 ขวด  | 100              |
| เครื่องมือ       | Hot glue gun + silicone sealant                   | 1 ชุด  | 500              |
| Antenna          | 4G LTE Antenna                                    | 1      | 60               |
| Antenna          | GPS Active Antenna                                | 1      | 90               |
| Antenna          | SMA Female Bulkhead IP67                          | 2      | 60               |
| Antenna          | SMA Male to SMA Female Cable                      | 2      | 80               |
| Waterproof       | Cable Gland PG7                                   | 5      | 75               |
| Waterproof       | Silicone Sealant Neutral Cure                     | 1      | 125              |
| Waterproof       | O-ring EPDM                                       | 1 ชุด  | 75               |
| Waterproof       | Silicone Grease                                   | 1      | 100              |
| Waterproof       | Silica Gel 2g                                     | 50 ซอง | 50               |
| Waterproof       | M3 Stainless Steel Screw                          | 20     | 40               |
| Waterproof       | M3 Brass Standoff                                 | 4      | 30               |
| Waterproof       | น้ำกลั่น (turbidity calibration)                  | 1 ลิตร | 40               |
| Connectors       | JST PH 2.0mm Connector Kit                        | 1 kit  | 100              |
| Connectors       | Dupont/jumper wire assortment                     | 1 ชุด  | 80               |
| Connectors       | Heat shrink tubing                                | 1 ชุด  | 60               |
| Connectors       | Zip tie UV resistant                              | 1 ถุง  | 40               |
| Connectors       | สายไฟ 22-24 AWG 4 สี                              | 4 ม้วน | 160              |
| Passive          | Resistor Kit                                      | 1 kit  | 200              |
| Passive          | Capacitor Kit                                     | 1 kit  | 200              |
|                  | **รวมเอ**                                         |        | **~15,963**      |

> **หมายเหตุ:** เอมีของครบสำหรับ: ประกอบ hardware จริง, ทดสอบ 4G/GPS, ทำ waterproof + IP67 self-test, ทดสอบ sensor calibration, ทำ enclosure 3D print ทุกเวอร์ชัน — ของบางอย่างใช้ร่วมกับ Phase 2 ได้ เช่น เครื่องมือบัดกรี, 3D Printer

> **หมายเหตุ:** เป้าหมาย: ออกแบบ PCB custom บน KiCad และสั่งผลิต — ทดสอบ PCB v1 → v2 → v3 จนทำงานเหมือน FS-HCore dev board ทุกฟังก์ชัน

## 2.1 PCB Fabrication (JLCPCB)

| รายการ                                  | สเปค / หมายเหตุ                                                                                                                        | จำนวน   | ราคา/ครั้ง (THB) | รวม (THB)      |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- | -------------- |
| PCB v1 — Fabrication                    | 2-layer FR4 1.6mm, HASL lead-free, Green soldermask, White silkscreen — ขนาด ~80×60mm — 10 ชิ้น/order ที่ JLCPCB — ราคาขึ้นกับขนาดจริง | 10 ชิ้น | ~400-600         | 500            |
| PCB v2 — Fabrication (แก้ issue จาก v1) | specs เดียวกับ v1 — สั่งหลังจากทดสอบ v1 และพบปัญหา                                                                                     | 10 ชิ้น | ~400-600         | 500            |
| PCB v3 — Fabrication (ถ้าจำเป็น)        | specs เดียวกัน — optional ถ้า v2 ยังมีปัญหา — ถ้า v2 ผ่านไม่ต้องสั่ง                                                                   | 10 ชิ้น | ~400-600         | 500 (optional) |

> **หมายเหตุ:** shipping จาก JLCPCB ใช้เวลา 5-7 วันทำการ (DHL Express) หรือ 10-15 วัน (ส่งทั่วไป) — แนะนำ DHL เพื่อลดเวลา

## 2.2 Components สำหรับประกอบ PCB (1 ชุด)

> **หมายเหตุ:** ซื้อ 1 ชุดก่อน — ถ้า PCB revision ไม่มี component เปลี่ยน ใช้ชุดเดิมได้ ไม่ต้องซื้อซ้ำ

| รายการ                            | LCSC Part #        | สเปค                                                                                        | จำนวน     | ราคา/ชิ้น (THB) | รวม (THB) |
| --------------------------------- | ------------------ | ------------------------------------------------------------------------------------------- | --------- | --------------- | --------- |
| SIMCom A7670E module              | C5765718           | LTE Cat 1, Band 1/3/5/8/28, LCC68 package — ต้องใช้ reflow oven หรือ hot air station บัดกรี | 1         | ~180            | 180       |
| AP2112K-3.3 LDO                   | C89358             | 3.3V 600mA SOT-25 — 5-pin SMD                                                               | 2 (สำรอง) | ~3              | 6         |
| MAX17048 Fuel Gauge               | C82148             | I2C 0x36, SOT-23-6 — แนะนำ PCBA                                                             | 2 (สำรอง) | ~15             | 30        |
| SI2301 P-MOSFET                   | C10487             | P-channel SOT-23 3-pin                                                                      | 5 (สำรอง) | ~2              | 10        |
| MAX485 RS485 Transceiver          | C385843            | SOP-8 3.3V compatible                                                                       | 2 (สำรอง) | ~5              | 10        |
| DW01A Battery Protection          | C351231            | SOT-23-6                                                                                    | 2 (สำรอง) | ~3              | 6         |
| FS8205A Dual N-MOSFET             | C916030            | SOT-23-6                                                                                    | 2 (สำรอง) | ~3              | 6         |
| TP4056 Li-ion Charger             | C382139            | SOP-8, ต้องการ RPROG 1.2kΩ สำหรับ 1A                                                        | 2 (สำรอง) | ~3              | 6         |
| Capacitor 470µF/16V Electrolytic  | C65129 (Panasonic) | Low-ESR, THT 6.3×11mm                                                                       | 3         | ~5              | 15        |
| Capacitor 100µF/10V Electrolytic  | C252534            | THT 5×11mm                                                                                  | 3         | ~3              | 9         |
| Capacitor 10µF/10V Ceramic X5R    | C19702             | 0805 SMD                                                                                    | 10        | <1              | 5         |
| Capacitor 100nF Ceramic X7R       | C307331            | 0402 SMD — decoupling ทุก IC                                                                | 20        | <1              | 5         |
| Resistor 4.7kΩ (pull-up)          | C25900             | 0402 — OneWire + I2C                                                                        | 10        | <1              | 3         |
| Resistor 10kΩ (pull-up/down)      | C25744             | 0402 — GPIO, MOSFET gate                                                                    | 20        | <1              | 3         |
| Resistor 100kΩ (pull-up)          | C25803             | 0402 — MOSFET gate                                                                          | 10        | <1              | 3         |
| Resistor 330Ω (LED)               | C25104             | 0402                                                                                        | 5         | <1              | 2         |
| Resistor 120Ω (RS485 termination) | C25087             | 0402                                                                                        | 5         | <1              | 2         |
| TVS Diode SMAJ6.5A                | C8545              | SMA — ESD/surge protection RS485                                                            | 5         | ~3              | 15        |
| LED Bicolor Green/Red 3mm         | ซื้อในไทย          | THT 3mm — common cathode                                                                    | 3         | ~3              | 9         |
| USB-C Panel Mount Waterproof      | C2682115 / Shopee  | IP67 พร้อม rubber cap 5V/2A                                                                 | 1         | ~50             | 50        |
| SMA Female Bulkhead IP67          | C709050 / Shopee   | 50Ω panel mount กันน้ำ                                                                      | 2         | ~20             | 40        |
| JST PH 2.0mm 2-pin set            | Shopee             | male + female + crimped wire 20cm                                                           | 5 คู่     | ~5/คู่          | 25        |
| JST PH 2.0mm 4-pin set            | Shopee             | male + female + crimped wire 20cm                                                           | 3 คู่     | ~8/คู่          | 24        |

> **หมายเหตุ:** แนะนำสั่ง components จาก LCSC รวม cart เดียว — ประหยัด shipping จาก China ค่า shipping ~150-300 THB ขึ้นกับน้ำหนัก ใช้เวลา 7-14 วัน

## 2.3 สรุปงบ Phase 2

**รวมทั้งหมด Phase 2: ~2,630 THB**

| หมวด                                   | รวม (THB) | หมายเหตุ                             |
| -------------------------------------- | --------- | ------------------------------------ |
| PCB Fabrication v1 (JLCPCB)            | ~500      |                                      |
| PCB Fabrication v2 (JLCPCB)            | ~500      |                                      |
| PCB Fabrication v3 (JLCPCB — optional) | ~500      | ถ้า v2 ผ่านไม่ต้องสั่ง               |
| Components 1 ชุด (LCSC รวม)            | ~650      | รวม shipping ~150 THB                |
| SIMCom A7670E module                   | ~180      | สั่งพร้อม components หรือ AliExpress |
| ค่าใช้จ่ายเบ็ดเตล็ด                    | ~300      |                                      |

> **หมายเหตุ:** เป้าหมาย: ผลิต batch แรก 10 ชิ้น สำหรับขายจริง + 3D print enclosure จากร้าน 2 ชิ้นสำหรับวางแสดง — launch โดยไม่รอ กสทช.

## 3.1 Production PCB & Assembly

| รายการ                           | สเปค / หมายเหตุ                                                            | จำนวน   | ราคา (THB)          | แหล่งซื้อ         |
| -------------------------------- | -------------------------------------------------------------------------- | ------- | ------------------- | ----------------- |
| PCB Production Batch (JLCPCB)    | PCB v_final specs เดียวกับ Phase 2 — สั่ง 10 ชิ้น                          | 10 ชิ้น | ~500                | jlcpcb.com        |
| Components Production ชุด (LCSC) | Components ครบชุดสำหรับ 1 เครื่อง production — ดู list Phase 2 section 2.2 | 1 ชุด   | ~650 (รวม shipping) | lcsc.com          |
| SIMCom A7670E (production unit)  | module สำหรับ production board                                             | 1       | ~180                | LCSC / AliExpress |
| 18650 Samsung 35E (production)   | 2 ก้อนสำหรับ production unit                                               | 2       | ~120/ก้อน           | Shopee Official   |
| GPS L76K (production)            | module สำหรับ production unit                                              | 1       | ~150                | LCSC / Shopee     |

## 3.2 Enclosure (3D Print จากร้าน)

| รายการ                           | สเปค / หมายเหตุ                                                                                                      | จำนวน  | ราคา (THB)             | แหล่งซื้อ                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------- | ------------------------------------------------------------------- |
| 3D Print Enclosure ASA — วางแสดง | ASA filament — สี Gray หรือ White — ความหนาผนัง 3mm — ขนาดตาม STL ที่เอออกแบบ — ขอใบเสนอราคาก่อน ราคาขึ้นกับขนาดจริง | 2 ชิ้น | ~300-500/ชิ้น (ประมาณ) | ร้านรับ print 3D ในไทย เช่น craftlabs3d.com, maliev.com หรือ Shopee |
| 3D Print Enclosure Lid ASA       | ฝาปิดกล่อง — ASA เหมือนกัน                                                                                           | 2 ชิ้น | รวมในราคาข้างบน        | ร้านเดียวกัน                                                        |

> **หมายเหตุ:** ราคา 3D print ขึ้นกับขนาดและน้ำหนักไฟล์จริง — อัพโหลด STL ที่ craftlabs3d.com เพื่อได้ราคาทันที ก่อนตัดสินใจสั่ง

## 3.3 Digital Setup (SaaS & Payment)

| รายการ                     | สเปค / หมายเหตุ                                                                                 | ราคา (THB)     | แหล่งซื้อ / ทำที่ไหน |
| -------------------------- | ----------------------------------------------------------------------------------------------- | -------------- | -------------------- |
| Stripe Account Setup       | สมัคร Stripe — ไม่มี setup fee — จ่าย transaction fee 3.65% ต่อครั้งเมื่อมีลูกค้าจ่ายเงิน       | 0              | stripe.com           |
| Omise Account Setup        | สมัคร Omise — ไม่มี setup fee — จ่าย transaction fee 3.65% — รองรับ PromptPay                   | 0              | omise.co             |
| LINE Official Account (OA) | สมัคร LINE OA — free plan รองรับ 500 push messages/เดือน — ถ้าเกินใช้ Light plan ~450 THB/เดือน | 0 (free tier)  | manager.line.biz     |
| Vercel Pro Upgrade         | Upgrade เมื่อ hobby tier ไม่พอ — $20/เดือน — ยังไม่ต้องใน Phase 3 เว้นแต่ traffic สูง           | 0 (ยังไม่ต้อง) | vercel.com           |

## 3.4 สรุปงบ Phase 3

**รวมทั้งหมด Phase 3: ~2,900 THB**

| หมวด                                                 | รวม (THB) | หมายเหตุ                 |
| ---------------------------------------------------- | --------- | ------------------------ |
| PCB production batch 10 ชิ้น                         | ~500      |                          |
| Components production 1 ชุด (รวม A7670E, GPS, 18650) | ~1,100    |                          |
| 3D Print enclosure จากร้าน 2 ชิ้น                    | ~800      | ประมาณ — ขึ้นกับขนาดจริง |
| Stripe + Omise + LINE OA setup                       | 0         | ไม่มีค่าใช้จ่าย upfront  |
| ค่าใช้จ่ายเบ็ดเตล็ด (shipping, packaging สินค้า)     | ~500      |                          |

# รายการที่ยังไม่รวมในงบ (ทำเมื่อพร้อม)

> **หมายเหตุ:** รายการต่อไปนี้ยังไม่รวมในงบ Phase 1-3 — ทำเมื่อธุรกิจพร้อมและมีรายได้พอ

| รายการ                            | ราคาประมาณ (THB)     | ทำเมื่อ                                      | หมายเหตุ                                                    |
| --------------------------------- | -------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| กสทช. Type Approval Certification | ~15,000              | มียอดขายพอ + ต้องการ certificate             | ยื่นผ่านห้องแล็บที่ได้รับรอง — ใช้เวลา 8-16 สัปดาห์         |
| IP67 Lab Testing (ห้องแล็บ)       | ~10,000              | ยื่นพร้อม กสทช.                              | self-test ก่อน ส่งห้องแล็บเมื่อยื่น กสทช.                   |
| Marketing & Advertising           | ~10,000+             | Phase 3 เมื่อ product พร้อม                  | Facebook/LINE ads, YouTube content — ใช้ word of mouth ก่อน |
| Vercel Pro Upgrade                | ~720/เดือน ($20)     | เมื่อ hobby tier ไม่พอ (>50 devices)         | ดู section 6.1.6 ในเอกสาร system design                     |
| LINE OA Light Plan                | ~450/เดือน           | เมื่อ push message > 200/เดือน (>40 devices) |                                                             |
| HiveMQ Standard                   | ~900/เดือน ($25)     | เมื่อ connections > 100 devices              |                                                             |
| Supabase Pro                      | ~900/เดือน ($25)     | เมื่อ DB > 500MB (~60 devices)               |                                                             |
| IoT SIM Bulk Plan                 | ~20-25 THB/เดือน/ซิม | เมื่อมี 50+ devices                          | ติดต่อ AIS/TRUE ขอ bulk rate                                |

# Tips การจัดซื้อ

## ลำดับการสั่งซื้อ Phase 1 แยกตามคน

### พล — ลำดับสั่งซื้อ (ทดสอบ firmware บน breadboard)

| ลำดับ        | สั่งอะไร                                                                  | ทำไม                                           | Lead Time                             |
| ------------ | ------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| 1 (ก่อนเลย)  | ESP32-S3 DevKit + GPS L76K + DS18B20 ×1 + Analog Turbidity ×1 + MAX485 ×1 | มี board + sensor เริ่มเขียน firmware ได้ทันที | 3-7 วัน (Shopee)                      |
| 1 (พร้อมกัน) | Breadboard + jumper wire + PSU (MB102) + Resistor kit + Capacitor kit     | ต่อวงจรทดสอบ sensor บน breadboard              | 3-7 วัน (Shopee) หรือ 7-14 วัน (LCSC) |
| 1 (พร้อมกัน) | MAX17048 Module + MT3608 + Level Shifter                                  | ทดสอบ driver ทุกตัว                            | 3-7 วัน (Shopee)                      |
| 1 (พร้อมกัน) | Multimeter + Logic Analyzer + USB-TTL Adapter + ESD Strap                 | เครื่องมือ debug firmware                      | 3-7 วัน (Shopee)                      |
| 2            | 18650 ×2 + Battery Holder + TP4056 + USB-C Cable                          | ทดสอบ deep sleep + power logic                 | 3-5 วัน (Shopee)                      |
| 2 (พร้อมกัน) | Domain name + Upstash QStash + สมัคร HiveMQ/Supabase/Vercel               | setup backend ได้เลยระหว่างรอของ               | ทำได้ทันที (online)                   |

> **หมายเหตุ:** พลสั่งของรอบเดียวได้เกือบทั้งหมด — ระหว่างรอของมาส่ง พลทำ backend (Vercel + Supabase + Dashboard) และเขียน firmware skeleton ได้เลย

### เอ — ลำดับสั่งซื้อ (hardware + assembly ครบชุด)

| ลำดับ        | สั่งอะไร                                                                                                                         | ทำไม                                             | Lead Time                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------- |
| 1 (ก่อนเลย)  | 3D Printer + Filament PLA + PETG                                                                                                 | ต้องใช้ print enclosure ทดสอบตั้งแต่ต้น          | 3-5 วัน (Shopee)                |
| 2 (พร้อมกัน) | FS-HCore-A7670C + GPS L76K + SMA Pigtail ×2                                                                                      | มี board ครบ เริ่มทดสอบ hardware ได้             | 5-10 วัน (Shopee/AliExpress)    |
| 2 (พร้อมกัน) | DS18B20 ×2 + Analog Turbidity ×1 + MAX485 ×1 + MAX17048 + MT3608 + Level Shifter                                                 | sensor + modules ครบชุดเอ + DS18B20 สำรอง 1 ชิ้น | 3-7 วัน (Shopee)                |
| 2 (พร้อมกัน) | เครื่องมือบัดกรี: Soldering iron + Solder wire + Flux + Tweezers + Flush cutter + Helping hands + Wire stripper + Crimping plier | เครื่องมือบัดกรีครบก่อนเริ่มประกอบ               | 1-5 วัน (Shopee/บางลำพู)        |
| 2 (พร้อมกัน) | IPA + ESD strap + Hot glue gun + Silicone sealant                                                                                | เครื่องมือทำความสะอาด + seal                     | 1-5 วัน (Shopee/ร้านฮาร์ดแวร์)  |
| 2 (พร้อมกัน) | Breadboard + jumper wire + Resistor kit + Capacitor kit                                                                          | ทดสอบ hardware บน breadboard ก่อนบัดกรี          | 3-7 วัน (Shopee)                |
| 3            | Antenna (4G + GPS) + SMA bulkhead ×2 + SMA pigtail ×2                                                                            | ทดสอบ 4G + GPS signal                            | 5-10 วัน (Shopee/AliExpress)    |
| 3 (พร้อมกัน) | Connectors: JST kit + Dupont wire + Heat shrink + Zip tie + สายไฟ 22-24 AWG                                                      | ทำสาย probe + wiring ภายในกล่อง                  | 3-7 วัน (Shopee/บางลำพู)        |
| 4            | SIM cards (AIS/TRUE/DTAC)                                                                                                        | ทดสอบ PSM mode + 4G ทุก operator                 | ซื้อได้ทันที (ร้าน / Shopee)    |
| 5            | Waterproof: Cable gland + O-ring + Silicone grease + Silica gel + M3 screw/standoff + น้ำกลั่น                                   | ทดสอบ waterproof + calibration ใน Phase 1 ปลาย   | 1-3 วัน (ร้านฮาร์ดแวร์ใกล้บ้าน) |

## แหล่งซื้อแนะนำ

| แหล่ง                           | เหมาะกับ                         | ข้อดี                              | ข้อเสีย                              |
| ------------------------------- | -------------------------------- | ---------------------------------- | ------------------------------------ |
| LCSC (lcsc.com)                 | Passive components, ICs, modules | ราคาถูกสุด, ของแท้จาก manufacturer | Shipping 7-14 วัน, min order บางชิ้น |
| Shopee / Lazada (ร้าน verified) | ทุกอย่าง — เร็ว                  | ส่งเร็ว 1-5 วัน, ง่าย              | ราคาสูงกว่า LCSC 20-50%              |
| AliExpress                      | Modules, antennas, connectors    | ราคาดี variety เยอะ                | Shipping 10-20 วัน, ของอาจไม่ตรงสเปค |
| บางลำพู (กรุงเทพ)               | Passive components, tools, wire  | ได้ของทันที ต่อรองราคาได้          | ต้องไปเอง, เปิดจันทร์-เสาร์          |
| HomePro / Global House          | Silicone sealant, hardware       | หาง่าย ทั่วประเทศ                  | ราคาสูง                              |
| JLCPCB (jlcpcb.com)             | PCB fabrication + PCBA           | ราคาถูก คุณภาพดี                   | Shipping 5-15 วัน                    |

## การเปรียบเทียบราคาก่อนซื้อ

- ตรวจสอบราคา component ที่ LCSC ก่อนเสมอ — อ้างอิง part number ในเอกสาร BOM
- สำหรับ Shopee/AliExpress — search ด้วย model number หรือ LCSC part number
- ราคา component อาจเปลี่ยนแปลง — เอกสารนี้อ้างอิง ณ มีนาคม 2026
- สั่ง LCSC รวม cart เดียว — ประหยัด shipping ~150-300 THB ต่อ order
- ซื้อสำรอง 20-50% สำหรับ SMD components ขนาดเล็ก — อาจหายระหว่างบัดกรี
