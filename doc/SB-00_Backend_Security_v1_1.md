# SB-00 AquaSense IoT — Backend & Security

**Version 1.1 | March 2026 | Confidential**

> **Reference baseline:** เอกสารนี้อ้างอิงสมมติฐานกลางใน [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) | **Last synced:** 2026-04-02

---

# 6. Backend Architecture

## 6.1 Tech Stack

### Core Infrastructure — Product ทำงานไม่ได้ถ้าขาด

| Layer                  | Technology                          | เหตุผล                                                                               |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| API Framework          | Next.js (App Router) + React        | Frontend + API Routes ในที่เดียว, Server Components, คุ้นเคย                         |
| Hosting / Serverless   | Vercel                              | Deploy Next.js, serverless functions, free tier เริ่มต้น, scale อัตโนมัติ            |
| UI Styling             | Tailwind CSS                        | Utility-first CSS, mobile-first responsive, ไม่ต้องเขียน CSS เยอะ                    |
| Chart / Graph          | Recharts                            | React-native charting library — sensor graph, trend, historical data                 |
| GPS Map                | Leaflet + OpenStreetMap tile        | render map แสดงตำแหน่งทุ่น real-time — ฟรี ถ้า traffic สูงต้อง self-host tile server |
| Database (Time-series) | Supabase (PostgreSQL + TimescaleDB) | Time-series optimized, Auth ในตัว, RLS, free tier ดี                                 |
| Real-time Primary      | Upstash Redis Pub-Sub + SSE         | primary real-time channel — latency < 100ms, ไม่มี connection limit                  |
| Real-time Fallback     | Supabase Realtime                   | fallback อัตโนมัติถ้า SSE disconnect — postgres_changes subscription                 |
| Future AI/Analytics    | pgvector (Supabase extension)       | รองรับ vector search สำหรับ anomaly detection ใน Phase 4 — enable ได้ทีหลัง          |
| Message Queue          | Upstash QStash                      | Guaranteed delivery, auto-retry, webhook buffer ป้องกัน data loss                    |
| Cache / Rate Limit     | Upstash Redis                       | Serverless, pay-per-use, latest values, rate limit per device/user                   |
| MQTT Broker            | HiveMQ Cloud                        | Managed, free 100 connections, TLS 1.2, WebSocket, REST API                          |
| File Storage           | Vercel Blob                         | OTA firmware binary + DB backups + export CSV                                        |
| Scheduled Jobs         | Vercel Cron                         | stale-check (15 นาที), db-backup (ทุกวัน 03:00), sim-expiry (ทุกวัน)                 |
| Auth                   | Supabase Auth                       | JWT, Row Level Security — user เห็นแค่ farm ของตัวเอง                                |
| Email Notification     | Resend                              | ส่ง email alert, daily digest, monthly report — free 3,000 emails/เดือน              |
| LINE Notification      | LINE Messaging API                  | Push message ผ่าน LINE OA — เกษตรกรไทยใช้ LINE เป็นหลัก                              |
| LINE OA                | LINE Official Account (AquaSense)   | ช่องทางรับ notification + chatbot support เบื้องต้น — paid plan pricing ต้อง re-check ก่อน commercial launch |
| Error Monitoring       | Sentry                              | แจ้งเตือนทันทีถ้า Vercel API error — production monitoring                           |
| Payment (Global)       | Stripe                              | จัดการ SaaS subscription, recurring billing, webhook                                 |
| Payment (ไทย)          | Omise                               | รองรับลูกค้าไทย — บัตรเครดิต + PromptPay ผ่าน Omise gateway                          |
| HTTPS / TLS            | Let's Encrypt (via Vercel)          | TLS cert อัตโนมัติ สำหรับ OTA firmware download + API                                |
| Webhook Security       | QStash Signing (HMAC-SHA256)        | verify ทุก webhook ที่เข้า Vercel — ป้องกัน spoofed data                             |

### Firmware & Device Stack — External Libraries

| Layer                | Technology                                                                  | เหตุผล                                                                                  |
| -------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Firmware Framework   | ESP-IDF v5.x                                                                | Production-grade, FreeRTOS ในตัว, power management ละเอียด                              |
| RTOS                 | FreeRTOS (version ตาม ESP-IDF v5.x)                                         | Task management, queue, semaphore — version ผูกกับ ESP-IDF ที่ใช้                       |
| Turbidity Protocol   | Phase 1: ADC analog read / Phase 2+: Modbus RTU library (ESP-IDF component) | Phase 1: voltage mapping / Phase 2+: communicate กับ SEN0600 RS485 — CRC check built-in |
| Temperature Protocol | OneWire + DS18B20 driver                                                    | อ่าน DS18B20 บน single-wire bus — support หลายตัวพร้อมกัน                               |
| GPS Parser           | NMEA 0183 parser (minmea library)                                           | parse GPGGA/GPRMC/GNRMC จาก L76K/NEO-M8N                                                |
| MQTT Client          | ESP-MQTT (built-in ESP-IDF)                                                 | QoS 1, persistent session, TLS 1.2, reconnect อัตโนมัติ                                 |
| OTA                  | ESP-IDF native OTA (esp_ota_ops)                                            | Dual partition app0/app1, rollback อัตโนมัติถ้า boot ล้มเหลว                            |
| Flash Security       | ESP32-S3 Flash Encryption + Secure Boot v2                                  | NVS encrypted, firmware signed — ต้อง enable ตอน production เท่านั้น                    |
| Firmware Signing     | RSA-3072 key (OpenSSL)                                                      | sign binary ก่อน OTA deploy — bootloader verify ก่อน execute                            |
| Key Storage          | HSM / Encrypted Vault (เช่น HashiCorp Vault)                                | เก็บ signing key อย่างปลอดภัย — ห้ามเก็บใน plaintext หรือ git                           |
| NTP Sync             | pool.ntp.org via AT+CNTP (SIM7670E)                                         | sync เวลาทุกรอบ 4G connect — ป้องกัน RTC drift                                          |

> **หมายเหตุ:** ESP-IDF Built-in APIs ที่ใช้งานหลัก: mbedTLS (TLS 1.2 สำหรับ MQTT + OTA HTTPS), nvs_flash (เก็บ config + buffer ใน flash), esp_sleep (deep sleep + RTC wakeup), esp_adc (อ่าน analog), esp_timer (software timer), esp_log (structured logging)

### Development Tools — ทีมใช้ระหว่างพัฒนา

| Tool               | Technology                             | ใช้สำหรับ                                                             |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------- |
| IDE                | VS Code + ESP-IDF Extension            | เขียน firmware — IntelliSense, build, flash, monitor ในที่เดียว       |
| Version Control    | GitHub (private repo)                  | เก็บ code firmware + backend + hardware design ทั้งหมด                |
| Large File Storage | Git LFS                                | เก็บ binary files ใน GitHub เช่น firmware .bin, Gerber, STL           |
| CI/CD              | GitHub Actions                         | auto build + sign firmware, run unit tests, deploy to Vercel          |
| PCB Design         | KiCad (open-source)                    | ออกแบบ schematic + PCB layout + Gerber export                         |
| 3D Enclosure       | Fusion 360 / FreeCAD                   | ออกแบบกล่อง, ทุ่น, bracket — export STL สำหรับ 3D print               |
| 3D Slicer          | Cura / PrusaSlicer                     | slice STL เป็น G-code ก่อนส่ง 3D printer                              |
| UI Design          | Figma                                  | ออกแบบ dashboard UI, mobile layout, user flow ก่อน implement          |
| API Testing        | Postman / Thunder Client               | test API endpoints, MQTT webhook, simulate device payload             |
| Network Debug      | Wireshark                              | debug network traffic, inspect MQTT over TLS, ตรวจ packet ระหว่าง dev |
| MQTT Debug         | MQTT Explorer                          | monitor MQTT topics, inspect message payload ระหว่าง dev              |
| Firmware Unit Test | Unity (C test framework)               | unit test firmware functions บน ESP-IDF — run ใน CI/CD                |
| Serial Monitor     | ESP-IDF Monitor (idf.py monitor)       | debug firmware log ผ่าน UART serial                                   |
| Logic Analyzer     | Saleae Logic / PulseView + cheap clone | debug OneWire, RS485, I2C, SPI signal บน PCB                          |

### Manufacturing & Supply

| ขั้นตอน                      | Vendor / Tool                          | หมายเหตุ                                                                            |
| ---------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| PCB Fabrication — Prototype  | JLCPCB                                 | ถูก, รวดเร็ว (5-7 วัน), เหมาะสำหรับ prototype และ batch เล็ก                        |
| PCB Fabrication — Production | PCBWay                                 | quality สูงกว่า, impedance control ดีกว่า เหมาะ batch ใหญ่                          |
| PCB Assembly (PCBA)          | JLCPCB SMT Assembly                    | บัดกรี SMD components — ประหยัดเวลา ลด human error                                  |
| 3D Print Prototype           | Bambu Lab / Creality (PETG หรือ ASA)   | PETG: ทนแดดพอใช้, ASA: ทนแดด UV ดีกว่า เหมาะ outdoor                                |
| 3D Print (Production)        | ร้านรับ print ASA/PC ในไทย             | ~400 THB/ชิ้น — ไม่ทำ Injection Mold เพราะ batch ยังเล็ก ปรับ design ได้ง่ายกว่า    |
| Component Sourcing           | LCSC / Mouser / Digi-Key               | LCSC: ถูกสุด, Mouser/Digi-Key: ของแท้ครบ datasheet ชัดเจน                           |
| Local Parts                  | ร้านอิเล็กทรอนิกส์ไทย (บางลำพู/Shopee) | resistor, capacitor, connector ราคาถูกซื้อได้เร็ว                                   |
| Test Equipment               | Multimeter + Oscilloscope              | วัด voltage, current, signal waveform — จำเป็นสำหรับ hardware debug + production QC |
| SIM Card (IoT)               | AIS / TRUE IoT bulk SIM                | ติดต่อขอ bulk plan 50+ SIM ราคาพิเศษ ~20-25 THB/เดือน                               |
| Certification Lab            | ห้องแล็บที่ได้รับรอง กสทช. ในไทย       | IP67 + EMC/RF testing — ทำก่อน commercial launch, ไม่บล็อก pilot                    |

### Content & Support

| ช่องทาง           | Platform                  | ใช้สำหรับ                                               |
| ----------------- | ------------------------- | ------------------------------------------------------- |
| วิดีโอ Onboarding | YouTube (unlisted/public) | วิดีโอแนะนำการใช้งาน 5 นาที ภาษาไทย — link ใน dashboard |
| คู่มือ PDF        | Canva / Google Docs       | step-by-step คู่มือพร้อมรูปถ่ายจริง ภาษาง่าย            |
| Customer Support  | LINE OA Chatbot           | ถามตอบปัญหาเบื้องต้น — battery, sensor, connectivity    |
| Landing Page      | Vercel + Next.js          | หน้าเว็บ product + ราคา + สมัครใช้งาน + SEO             |
| Web Analytics     | Vercel Analytics          | monitor dashboard usage, page performance, error rate   |

## 6.1.6 Free Tier Analysis — เริ่มต้นฟรี Upgrade เมื่อไหร่

> **Pricing source:** รายการ free tier / paid plan ใน section นี้ให้ยึด [SB-00_Third_Party_Pricing_Baseline_v1_1.md](./SB-00_Third_Party_Pricing_Baseline_v1_1.md) เป็นตารางกลาง

> **หมายเหตุ:** ตัวเลข free tier และ paid plan ใน section นี้เป็น internal planning assumptions ที่ sync กับ [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) ไม่ใช่ live vendor quote
>
> ทุก service มี free tier เพียงพอสำหรับเริ่มต้น ยกเว้นกรณี Phase 1 ที่มี `2 active devices` ทำงานขนานกัน ซึ่งทำให้ Upstash QStash เกิน free tier ได้ตั้งแต่ช่วง dev/test (`2 × 288 = 576 msg/day`)

### Free Tier Limits ต่อ Service

| Service            | Free Tier Limit        | Upgrade เมื่อ           | ค่าหลัง Upgrade    |
| ------------------ | ---------------------- | ----------------------- | ------------------ |
| HiveMQ Cloud       | 100 connections        | ≥ 100 devices           | Standard ~$25/mo   |
| Supabase           | 500MB DB, 50k rows/day | ≥ 60 devices            | Pro $25/mo         |
| Upstash Redis      | 10,000 req/day         | ≥ 17 devices            | Pay-per-use ~$5/mo |
| Upstash QStash     | 500 msg/day            | ≥ 2 active devices      | Pay-per-use ~$4/mo |
| Vercel             | Hobby 100GB bandwidth  | ≥ 50 devices            | Pro $20/mo         |
| Resend             | 3,000 emails/mo        | ≥ 88 devices            | Starter $20/mo     |
| LINE Messaging API | 200 msg/mo             | ≥ 40 devices            | Paid plan ~150 THB/mo (planning estimate; re-check before commercial launch) |
| Sentry             | 5,000 errors/mo        | ≥ 500 devices (ไม่เร็ว) | Team $26/mo        |

### ค่า Infrastructure ตาม Scale

| ระดับ                 | จำนวน Devices | ค่า Infra/เดือน       | Revenue SaaS/เดือน | Net Margin |
| --------------------- | ------------- | --------------------- | ------------------ | ---------- |
| เริ่มต้น (MVP)        | 1-16 เครื่อง  | ~$4/mo (~144 THB)     | 299-4,784 THB      | ~97%       |
| Phase 1               | 5 เครื่อง     | ~$4/mo (~144 THB)     | 1,495 THB          | ~90%       |
| Phase 2               | 20 เครื่อง    | ~$29/mo (~1,044 THB)  | 5,980 THB          | ~83%       |
| เริ่ม upgrade หลายตัว | 50 เครื่อง    | ~$58/mo (~2,088 THB)  | 14,950 THB         | ~86%       |
| Scale                 | 100 เครื่อง   | ~$83/mo (~2,988 THB)  | 29,900 THB         | ~90%       |
| Scale+                | 200 เครื่อง   | ~$108/mo (~3,888 THB) | 59,800 THB         | ~94%       |

> **หมายเหตุ:** Revenue คำนวณจาก SaaS Basic 299 THB/farm/mo เท่านั้น ยังไม่รวม hardware margin และ SaaS Pro — margin จริงสูงกว่านี้

### Upgrade Sequence — ลำดับที่ต้อง Upgrade

| ลำดับ      | Service            | Trigger               | เหตุผล                                                |
| ---------- | ------------------ | --------------------- | ----------------------------------------------------- |
| 1 (ช่วง dev/test) | Upstash QStash     | 2+ active devices      | Free tier 500 msg/day ไม่พอเมื่อมี 2 devices ส่งรวม ~576 msg/day |
| 2          | Upstash Redis      | 17+ devices           | Free tier 10,000 req/day เกินเพราะ 2 ops ต่อ message  |
| 3          | LINE Messaging API | 40+ devices           | Free tier 200 msg/mo เกินเร็วถ้ามี alert บ่อย         |
| 4          | Vercel Pro         | 50+ devices           | Bandwidth + Cron jobs ที่ต้องการ production SLA       |
| 5          | HiveMQ Standard    | 100+ devices          | Free tier รองรับแค่ 100 concurrent connections        |
| 6          | Supabase Pro       | 60+ devices           | DB size + PITR backup + unlimited API calls           |
| 7          | Resend Starter     | 88+ devices           | Free tier 3,000 emails/mo — ค่อยๆ เกิน                |
| 8          | Sentry Team        | 500+ devices (ไกลมาก) | Free tier 5,000 errors/mo เกินช้ามาก                  |

## 6.2 Data Flow (Bidirectional)

ระบบสื่อสาร 2 ทิศทาง — Device ส่งข้อมูลขึ้น Server และ Server ส่งคำสั่งกลับลง Device ผ่าน MQTT topic แยกกัน มีทั้งหมด 4 flow หลัก

### MQTT Topic Map — Reference

| Topic                      | ทิศทาง          | ใช้สำหรับ                                                  | QoS |
| -------------------------- | --------------- | ---------------------------------------------------------- | --- |
| aquasense/{id}/telemetry   | Device → Server | sensor data ทุก interval                                   | 1   |
| aquasense/{id}/status      | Device → Server | boot event, battery, signal, safe mode                     | 1   |
| aquasense/{id}/diag        | Device → Server | diagnostic payload ทุก 1 ชม. หรือเมื่อมี error             | 1   |
| aquasense/{id}/command     | Server → Device | คำสั่งจาก dashboard: set_interval, reboot, calibrate, etc. | 1   |
| aquasense/{id}/command/ack | Device → Server | device ยืนยันว่าได้รับและ execute command แล้ว             | 1   |
| aquasense/{id}/ota         | Server → Device | trigger OTA update พร้อม firmware URL + version            | 1   |

### Flow 1 — Upstream: Telemetry (Normal Case)

| ขั้นตอน               | รายละเอียด                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| 1. Device อ่าน sensor | DS18B20 + Turbidity (Phase 1: analog / Phase 2+: SEN0600 RS485) + GPS + battery — ทุก interval |
| 2. Validate           | Firmware ตรวจ range check, rate-of-change, stuck value ก่อนส่ง                                 |
| 3. Publish MQTT       | Device publish ไปที่ aquasense/{id}/telemetry ผ่าน TLS 1.2                                     |
| 4. HiveMQ รับ         | MQTT Broker รับ message — webhook forward ไปที่ QStash                                         |
| 5. QStash queue       | Buffer + auto-retry (max 3 ครั้ง, exponential backoff) ถ้า Vercel ล้ม                          |
| 6. Vercel API รับ     | POST /api/webhook/mqtt — verify HMAC-SHA256 signature + timestamp                              |
| 7. Store              | Supabase INSERT (time-series) + Redis SET (latest values) + Redis PUBLISH                      |
| 8. Alert check        | ตรวจ alert rules ทั้งหมดของ device — ถ้า threshold ถูกละเมิด trigger alert flow                |
| 9. Dashboard update   | SSE จาก Redis Pub/Sub → Dashboard อัพเดต real-time (< 1 วินาที)                                |

### Flow 2 — Upstream: Buffered Data (Offline Recovery)

| ขั้นตอน                 | รายละเอียด                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- |
| 1. Device offline       | 4G ไม่มี signal → firmware buffer readings ลง NVS flash (max ~500 readings)         |
| 2. Device กลับมา online | 4G connect สำเร็จ → ตรวจ buf_count ใน RTC memory                                    |
| 3. ส่ง batch            | Publish buffered readings เป็น batch ไปที่ /telemetry — max 50 readings ต่อ message |
| 4. Server รับ batch     | ตรวจ timestamp ของแต่ละ reading — ยอมรับ ts ที่ไม่เกิน 48 ชม. ย้อนหลัง              |
| 5. Dedup check          | ตรวจ ts + device_id ใน Redis (TTL 10 นาที) — ถ้าซ้ำ ignore                          |
| 6. Store ตามลำดับ       | Supabase INSERT พร้อม buffered_count field — dashboard แสดงช่วงที่ offline          |

### Flow 3 — Downstream: Commands & Config

| ขั้นตอน                    | รายละเอียด                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| 1. ลูกค้าสั่งจาก Dashboard | เช่น เปลี่ยน interval, reboot, calibrate, OTA update                                          |
| 2. Vercel บันทึก + ส่ง     | POST /api/devices/{id}/command → บันทึก command_log (status: pending) → เรียก HiveMQ REST API |
| 3. HiveMQ publish          | Broker publish ไปที่ aquasense/{id}/command — เก็บไว้ถ้า device offline (persistent session)  |
| 4. Device รับ              | Device subscribe topic นี้ตลอด — รับทันทีที่ 4G active หรือตื่นจาก sleep                      |
| 5. Device execute          | ทำตามคำสั่ง เช่น update NVS config, trigger reboot, เริ่ม OTA download                        |
| 6. Device ACK              | Publish ไปที่ aquasense/{id}/command/ack พร้อม {id, status: success/failed, detail}           |
| 7. Server update           | อัพเดต command_log status → Dashboard แสดงผลทันที                                             |

> **หมายเหตุ:** Command Timeout: ถ้าไม่ได้ ACK ภายใน 24 ชม. → Vercel Cron อัพเดต status เป็น timeout → แจ้ง dashboard + LINE ให้เจ้าของทราบ — ไม่มี auto-retry เพราะ command บางตัวเช่น reboot ไม่ควรทำซ้ำอัตโนมัติ

### Flow 4 — Downstream: OTA Firmware Update

| ขั้นตอน                  | รายละเอียด                                                                     |
| ------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1. Upload firmware       | ทีม sign firmware binary (RSA-3072) → upload ไปที่ Vercel Blob → ได้ HTTPS URL |
| 2. Trigger OTA           | Dashboard ส่ง command ผ่าน aquasense/{id}/ota พร้อม {url, version, checksum}   |
| 3. Device download       | Device download firmware ผ่าน HTTPS (mbedTLS) → flash ลง inactive partition    |
| 4. Verify                | ตรวจ checksum SHA256 + verify RSA signature — ถ้าผิด abort ทันที               |
| 5. Reboot                | Device reboot เข้า partition ใหม่ — bootloader verify signature อีกครั้ง       |
| 6. Confirm หรือ Rollback | Boot สำเร็จ → mark valid → ACK กลับ                                            | Boot ล้มเหลว → rollback อัตโนมัติไป partition เดิม |

### Flow 5 — Alert Trigger

| ขั้นตอน                | รายละเอียด                                                               |
| ---------------------- | ------------------------------------------------------------------------ |
| 1. Telemetry เข้า      | Vercel รับ telemetry payload จาก QStash                                  |
| 2. ตรวจ alert rules    | Query alert_rules ของ device นี้จาก Supabase — ตรวจทุก rule              |
| 3. Threshold ถูกละเมิด | ตรวจว่ามี active alert อยู่แล้วหรือไม่ (ป้องกัน duplicate)               |
| 4. Duration check      | ถ้า rule มี duration requirement → รอให้ครบก่อน trigger                  |
| 5. สร้าง alert event   | INSERT ลง alert_events table — status: active                            |
| 6. ส่ง notification    | LINE Messaging API + Resend Email + Web Push พร้อมกัน (async)            |
| 7. Auto-resolve        | เมื่อค่ากลับมาปกติ → อัพเดต alert_events status: resolved + แจ้งอีกครั้ง |

### Persistent MQTT Session — ไม่พลาด Command

- Device ใช้ MQTT persistent session (clean_session=false) + QoS 1
- ถ้า device อยู่ใน deep sleep ขณะ command ถูกส่ง → broker เก็บ message ไว้ใน session
- ครั้งถัดไปที่ device ตื่นและ connect → รับ command ที่ค้างอยู่ทันที ไม่มีหาย
- Command timeout 24 ชม. — Vercel Cron ตรวจทุก 15 นาที → mark timeout ถ้าเกินกำหนด
- ไม่มี auto-retry สำหรับ command — เพราะ command เช่น reboot ไม่ควรทำซ้ำโดยอัตโนมัติ

## 6.3 Database Schema

### 6.3.1 ภาพรวม Tables ทั้งหมด

| Table            | ใช้เก็บ                              | หมายเหตุ                                                |
| ---------------- | ------------------------------------ | ------------------------------------------------------- |
| farms            | ฟาร์มของลูกค้า                       | owner_id, location, subscription_plan, expires_at       |
| zones            | โซนในฟาร์ม                           | farm_id, name, GPS coordinate                           |
| devices          | ข้อมูลอุปกรณ์ SB-00                  | config JSONB (ดูรายละเอียด section 6.3.3)               |
| user_profiles    | preferences ของ user                 | timezone, notification settings, language               |
| telemetry        | sensor readings (time-series)        | TimescaleDB hypertable, retention 90 วัน raw            |
| telemetry_hourly | hourly aggregate (materialized view) | AVG/MIN/MAX ต่อชั่วโมง เก็บตลอดไป                       |
| alert_rules      | กฎการแจ้งเตือน                       | threshold, condition, duration, notify channels         |
| alert_events     | ประวัติ alert                        | triggered_at, resolved_at, notification_sent_at, status |
| command_log      | คำสั่งที่ส่งให้ device               | status, retry_count, timeout_at, acked_at               |
| calibration_log  | ประวัติการ calibrate                 | audit trail — old_values vs new_values                  |
| sim_cards        | จัดการ SIM                           | iccid, operator, expires_at, data_usage                 |
| ota_releases     | firmware version history             | version, url, changelog, released_at                    |
| webhook_logs     | log ทุก webhook ที่เข้า              | สำหรับ debug + audit — เก็บ 7 วัน                       |

### 6.3.2 Telemetry Table (ละเอียด)

| Field          | Type                        | หมายเหตุ                                                            |
| -------------- | --------------------------- | ------------------------------------------------------------------- |
| time           | TIMESTAMPTZ NOT NULL        | partition key — TimescaleDB hypertable                              |
| device_id      | UUID REFERENCES devices(id) |                                                                     |
| temperature    | REAL                        | °C — null ถ้า sensor fault                                          |
| turbidity      | REAL                        | NTU — null ถ้า sensor fault                                         |
| lat            | DOUBLE PRECISION            | GPS latitude — null ถ้าไม่มี fix                                    |
| lng            | DOUBLE PRECISION            | GPS longitude — null ถ้าไม่มี fix                                   |
| battery_pct    | SMALLINT                    | 0-100%                                                              |
| signal_rssi    | SMALLINT                    | dBm — signal strength                                               |
| buffered_count | SMALLINT DEFAULT 0          | 0 = ส่ง real-time, > 0 = มาจาก buffer                               |
| fw_version     | TEXT                        | firmware version ที่ส่งข้อมูล                                       |
| qc_flag        | TEXT                        | null=OK, rate_exceeded, cross_check_warn, stuck_sensor, clock_drift |

| Index / Policy   | รายละเอียด                                                                   |
| ---------------- | ---------------------------------------------------------------------------- |
| Primary index    | CREATE INDEX ON telemetry (device_id, time DESC)                             |
| Retention policy | SELECT add_retention_policy('telemetry', INTERVAL '90 days')                 |
| Hourly aggregate | CREATE MATERIALIZED VIEW telemetry_hourly — AVG/MIN/MAX per hour, เก็บตลอดไป |
| Compression      | enable_chunk_compression หลังจาก 7 วัน — ประหยัด storage ~90%                |

### 6.3.3 Devices.config JSONB Structure

| Field ใน config    | Type   | ความหมาย                                          |
| ------------------ | ------ | ------------------------------------------------- | --------------------------------------- |
| interval_sec       | number | reading/sending interval ที่ลูกค้าตั้ง (วินาที)   |
| night_interval_sec | number | interval ช่วงกลางคืน (ถ้าตั้ง sleep_schedule)     |
| night_start_hour   | number | เวลาเริ่ม night mode (0-23)                       |
| night_end_hour     | number | เวลาสิ้นสุด night mode (0-23)                     |
| sensor_mapping     | object | {T1: ROM_address} — OneWire address mapping       |
| turbidity_cal      | object | {R_clear, R_400} — calibration values             |
| temp_offset        | object | {T1: offset_value} — temperature offset per probe |
| apn_override       | string | null                                              | APN override ถ้าไม่ใช่ operator มาตรฐาน |
| alert_thresholds   | object | soft threshold บน device สำหรับ local check       |

### 6.3.4 Alert Events (ละเอียด)

| Field                | Type                            | หมายเหตุ                                             |
| -------------------- | ------------------------------- | ---------------------------------------------------- |
| id                   | UUID PRIMARY KEY                |                                                      |
| rule_id              | UUID REFERENCES alert_rules(id) |                                                      |
| device_id            | UUID REFERENCES devices(id)     |                                                      |
| triggered_at         | TIMESTAMPTZ DEFAULT now()       | เวลาที่ alert เริ่มต้น                               |
| resolved_at          | TIMESTAMPTZ                     | null = ยัง active                                    |
| notification_sent_at | TIMESTAMPTZ                     | null = ยังไม่ได้ส่ง — ใช้ตรวจ duplicate notification |
| value_at_trigger     | REAL                            | ค่า sensor ณ เวลาที่ trigger                         |
| status               | TEXT                            | active / acknowledged / resolved                     |
| acknowledged_by      | UUID REFERENCES auth.users(id)  | user ที่กด acknowledge                               |
| acknowledged_at      | TIMESTAMPTZ                     |                                                      |

### 6.3.5 Command Log (ละเอียด)

| Field       | Type                           | หมายเหตุ                                                    |
| ----------- | ------------------------------ | ----------------------------------------------------------- |
| id          | UUID PRIMARY KEY               | ใช้เป็น command id ที่ส่งไป device ด้วย                     |
| device_id   | UUID REFERENCES devices(id)    |                                                             |
| command     | TEXT NOT NULL                  | set_interval, reboot, ota_update, calibrate_turbidity, etc. |
| params      | JSONB                          | parameters ของ command เช่น {interval_sec: 300}             |
| sent_at     | TIMESTAMPTZ DEFAULT now()      |                                                             |
| timeout_at  | TIMESTAMPTZ                    | sent_at + 24 ชม. — Cron ตรวจและ mark timeout                |
| acked_at    | TIMESTAMPTZ                    | null = ยังไม่ได้ ACK                                        |
| retry_count | SMALLINT DEFAULT 0             | จำนวนครั้งที่ resend (manual retry จาก dashboard)           |
| status      | TEXT DEFAULT pending           | pending / sent / acked / failed / timeout                   |
| result      | JSONB                          | ACK payload จาก device — success/failed + detail            |
| sent_by     | UUID REFERENCES auth.users(id) | user ที่สั่ง                                                |

### 6.3.6 OTA Releases

| Field           | Type                           | หมายเหตุ                                     |
| --------------- | ------------------------------ | -------------------------------------------- |
| id              | UUID PRIMARY KEY               |                                              |
| version         | TEXT UNIQUE NOT NULL           | semantic version เช่น 1.2.3                  |
| url             | TEXT NOT NULL                  | Vercel Blob URL ของ firmware binary          |
| checksum_sha256 | TEXT NOT NULL                  | verify หลัง download                         |
| min_hw_version  | TEXT                           | hardware version ต่ำสุดที่รองรับ             |
| changelog       | TEXT                           | สรุปการเปลี่ยนแปลง                           |
| is_stable       | BOOLEAN DEFAULT false          | true = push ได้ทุก device, false = beta only |
| released_at     | TIMESTAMPTZ DEFAULT now()      |                                              |
| released_by     | UUID REFERENCES auth.users(id) |                                              |

### 6.3.7 Webhook Logs

| Field         | Type                      | หมายเหตุ                                            |
| ------------- | ------------------------- | --------------------------------------------------- |
| id            | UUID PRIMARY KEY          |                                                     |
| device_id     | TEXT                      | device_id จาก payload (อาจไม่ match ถ้า spoofed)    |
| received_at   | TIMESTAMPTZ DEFAULT now() |                                                     |
| payload_hash  | TEXT                      | SHA256 ของ payload — ใช้ detect duplicate           |
| status        | TEXT                      | accepted / rejected / duplicate / invalid_signature |
| error_detail  | TEXT                      | เหตุผลที่ reject — ถ้า status ไม่ใช่ accepted       |
| processing_ms | INTEGER                   | เวลาที่ใช้ process (ms) — monitor performance       |

> **หมายเหตุ:** Webhook logs เก็บแค่ 7 วัน — ใช้ Vercel Cron ลบทุกวัน ป้องกัน DB โตเร็ว แต่เพียงพอสำหรับ debug ปัญหาย้อนหลัง 1 สัปดาห์

### 6.3.8 Farms Table (ละเอียด)

| Field                   | Type                                       | หมายเหตุ                                                     |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| id                      | UUID PRIMARY KEY DEFAULT gen_random_uuid() |                                                              |
| name                    | TEXT NOT NULL                              | ชื่อฟาร์ม                                                    |
| owner_id                | UUID REFERENCES auth.users(id)             | เจ้าของบัญชี                                                 |
| location                | POINT                                      | GPS coordinate ของฟาร์ม (optional)                           |
| subscription_plan       | TEXT DEFAULT free                          | free / basic / pro — ดู plan details ใน section 9            |
| subscription_started_at | TIMESTAMPTZ                                | วันที่เริ่ม subscription ปัจจุบัน                            |
| subscription_expires_at | TIMESTAMPTZ                                | null = free forever, มีค่า = paid plan มีวันหมดอายุ          |
| trial_expires_at        | TIMESTAMPTZ                                | trial period — หลังจากนี้ต้อง upgrade หรือ downgrade to free |
| stripe_customer_id      | TEXT                                       | Stripe customer ID สำหรับ billing                            |
| omise_customer_id       | TEXT                                       | Omise customer ID สำหรับ billing ลูกค้าไทย                   |
| created_at              | TIMESTAMPTZ DEFAULT now()                  |                                                              |

### 6.3.9 User Profiles (ละเอียด)

| Field             | Type                                       | หมายเหตุ                                           |
| ----------------- | ------------------------------------------ | -------------------------------------------------- |
| id                | UUID REFERENCES auth.users(id) PRIMARY KEY | ผูกกับ Supabase Auth user                          |
| display_name      | TEXT                                       | ชื่อที่แสดงใน dashboard                            |
| phone             | TEXT                                       | เบอร์โทร (optional)                                |
| line_user_id      | TEXT                                       | LINE user ID — ใช้ส่ง push message ผ่าน LINE OA    |
| timezone          | TEXT DEFAULT Asia/Bangkok                  | timezone สำหรับแสดงเวลาและ schedule                |
| language          | TEXT DEFAULT th                            | th / en                                            |
| notify_line       | BOOLEAN DEFAULT true                       | เปิด/ปิด LINE notification                         |
| notify_email      | BOOLEAN DEFAULT true                       | เปิด/ปิด email notification                        |
| notify_web_push   | BOOLEAN DEFAULT true                       | เปิด/ปิด web push notification                     |
| quiet_hours_start | SMALLINT                                   | เวลาเริ่ม quiet hours (0-23) — ไม่ส่ง notification |
| quiet_hours_end   | SMALLINT                                   | เวลาสิ้นสุด quiet hours (0-23)                     |
| created_at        | TIMESTAMPTZ DEFAULT now()                  |                                                    |
| updated_at        | TIMESTAMPTZ DEFAULT now()                  |                                                    |

### 6.3.10 Data Usage Tracking

| Field           | Type                        | หมายเหตุ                                                  |
| --------------- | --------------------------- | --------------------------------------------------------- |
| month           | DATE NOT NULL               | วันที่ 1 ของเดือน เช่น 2026-03-01                         |
| device_id       | UUID REFERENCES devices(id) |                                                           |
| messages_sent   | INTEGER DEFAULT 0           | จำนวน MQTT messages ที่ส่งในเดือนนั้น                     |
| bytes_estimated | BIGINT DEFAULT 0            | ปริมาณ data ประมาณ (bytes) — คำนวณจาก messages × avg size |
| 4g_mb_estimated | REAL                        | ปริมาณ 4G data ประมาณ (MB) รวม overhead                   |
| PRIMARY KEY     | (month, device_id)          | composite key                                             |

> **หมายเหตุ:** data_usage update ทุกรอบที่ Vercel รับ webhook — ใช้ ON CONFLICT DO UPDATE เพื่อ increment counter อย่างปลอดภัย

### 6.3.11 Telemetry Hourly (Materialized View)

| รายละเอียด     | ค่า                                                                 |
| -------------- | ------------------------------------------------------------------- |
| ประเภท         | TimescaleDB Continuous Aggregate (Materialized View)                |
| Source table   | telemetry (raw data)                                                |
| Time bucket    | 1 hour                                                              |
| Fields         | AVG/MIN/MAX ของ temperature, turbidity, battery_pct ต่อชั่วโมง      |
| Refresh policy | real-time aggregate — อัพเดตอัตโนมัติเมื่อ raw data เข้า            |
| Retention      | เก็บตลอดไป (ไม่ลบ) — ใช้สำหรับ historical charts และ monthly report |
| ใช้เมื่อ       | query ข้อมูลย้อนหลัง > 7 วัน — เร็วกว่า query raw telemetry มาก     |

### 6.3.12 Indexes ที่สำคัญ

| Table        | Index                                                        | เหตุผล                                       |
| ------------ | ------------------------------------------------------------ | -------------------------------------------- |
| telemetry    | CREATE INDEX ON telemetry (device_id, time DESC)             | query ข้อมูลล่าสุดต่อ device — ใช้บ่อยที่สุด |
| devices      | CREATE INDEX ON devices (farm_id)                            | list devices ในฟาร์ม                         |
| devices      | CREATE INDEX ON devices (zone_id)                            | list devices ใน zone                         |
| alert_events | CREATE INDEX ON alert_events (status) WHERE status = active  | partial index — หา active alerts เร็ว        |
| alert_events | CREATE INDEX ON alert_events (device_id, triggered_at DESC)  | ประวัติ alert ต่อ device                     |
| command_log  | CREATE INDEX ON command_log (device_id, sent_at DESC)        | ประวัติ command ต่อ device                   |
| command_log  | CREATE INDEX ON command_log (status) WHERE status = pending  | partial index — หา pending commands          |
| sim_cards    | CREATE INDEX ON sim_cards (expires_at) WHERE status = active | Cron ตรวจ SIM ใกล้หมดอายุ                    |
| webhook_logs | CREATE INDEX ON webhook_logs (received_at DESC)              | ลบ log เก่า + debug ย้อนหลัง                 |

### 6.3.13 Row Level Security (RLS) Policies

ทุก table ที่มีข้อมูลของลูกค้าต้อง enable RLS — user เห็นแค่ข้อมูลของ farm ตัวเองเท่านั้น

| Table         | Policy                           | เงื่อนไข                                              |
| ------------- | -------------------------------- | ----------------------------------------------------- |
| farms         | SELECT own farms only            | owner_id = auth.uid() หรือ member ของ farm            |
| devices       | SELECT own devices only          | farm_id IN (farms ที่ user มีสิทธิ์)                  |
| telemetry     | SELECT own telemetry only        | device_id IN (devices ที่ user มีสิทธิ์)              |
| alert_events  | SELECT/UPDATE own alerts         | device_id IN (devices ที่ user มีสิทธิ์)              |
| command_log   | SELECT own commands              | device_id IN (devices ที่ user มีสิทธิ์)              |
| user_profiles | SELECT/UPDATE own profile only   | id = auth.uid()                                       |
| webhook_logs  | Admin only                       | ปิด RLS สำหรับ public — เข้าได้เฉพาะ service role key |
| ota_releases  | SELECT all (read-only for users) | INSERT/UPDATE เฉพาะ service role key                  |

> **หมายเหตุ:** Service role key (ใช้ใน Vercel backend เท่านั้น) bypass RLS ได้ทั้งหมด — ห้ามเปิดเผย key นี้ใน frontend หรือ client-side code เด็ดขาด

### 6.3.14 Devices Table (ละเอียด)

| Field            | Type                                       | หมายเหตุ                                                           |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| id               | UUID PRIMARY KEY DEFAULT gen_random_uuid() |                                                                    |
| device_code      | TEXT UNIQUE NOT NULL                       | รหัสอุปกรณ์ เช่น SB00-001 — ติด QR code บนกล่อง                    |
| farm_id          | UUID REFERENCES farms(id)                  | ฟาร์มที่อุปกรณ์สังกัด                                              |
| zone_id          | UUID REFERENCES zones(id)                  | zone ที่อุปกรณ์อยู่ (optional)                                     |
| name             | TEXT                                       | ชื่อที่ลูกค้าตั้ง เช่น ทุ่น บ่อ 1                                  |
| firmware_version | TEXT                                       | firmware version ปัจจุบัน — อัพเดตเมื่อ OTA สำเร็จ                 |
| hardware_version | TEXT                                       | hardware revision เช่น v1.0 — ใช้ตรวจ OTA compatibility            |
| imei             | TEXT                                       | IMEI ของ 4G module                                                 |
| last_seen_at     | TIMESTAMPTZ                                | เวลาที่รับข้อมูลล่าสุด — ใช้ detect offline                        |
| last_lat         | DOUBLE PRECISION                           | GPS latitude ล่าสุด — cache ไว้แสดง map โดยไม่ต้อง query telemetry |
| last_lng         | DOUBLE PRECISION                           | GPS longitude ล่าสุด                                               |
| config           | JSONB DEFAULT {}                           | interval, sensor_mapping, calibration, apn_override (ดู 6.3.3)     |
| status           | TEXT DEFAULT offline                       | online / offline / error / safe_mode / updating                    |
| provisioned_at   | TIMESTAMPTZ                                | วันที่ลงทะเบียน device ครั้งแรก                                    |
| provisioned_by   | UUID REFERENCES auth.users(id)             | user ที่ลงทะเบียน                                                  |
| created_at       | TIMESTAMPTZ DEFAULT now()                  |                                                                    |

### 6.3.15 Zones Table (ละเอียด)

| Field       | Type                                       | หมายเหตุ                                                |
| ----------- | ------------------------------------------ | ------------------------------------------------------- |
| id          | UUID PRIMARY KEY DEFAULT gen_random_uuid() |                                                         |
| farm_id     | UUID REFERENCES farms(id) NOT NULL         |                                                         |
| name        | TEXT NOT NULL                              | ชื่อ zone เช่น บ่อที่ 1, บ่อทดลอง                       |
| description | TEXT                                       | รายละเอียดเพิ่มเติม                                     |
| location    | POINT                                      | GPS coordinate กลาง zone (optional)                     |
| area_sqm    | REAL                                       | ขนาดพื้นที่ (ตร.ม.) — optional สำหรับ analytics         |
| water_type  | TEXT                                       | freshwater / saltwater / brackish — ใช้สำหรับ analytics |
| species     | TEXT                                       | ชนิดสัตว์น้ำที่เลี้ยง เช่น หอยแครง — optional           |
| created_at  | TIMESTAMPTZ DEFAULT now()                  |                                                         |

### 6.3.16 Farm Members Table

เก็บความสัมพันธ์ระหว่าง user กับ farm — รองรับ team management หลายคนต่อ 1 farm

| Field       | Type                                       | หมายเหตุ                                  |
| ----------- | ------------------------------------------ | ----------------------------------------- |
| id          | UUID PRIMARY KEY DEFAULT gen_random_uuid() |                                           |
| farm_id     | UUID REFERENCES farms(id) NOT NULL         |                                           |
| user_id     | UUID REFERENCES auth.users(id) NOT NULL    |                                           |
| role        | TEXT NOT NULL                              | owner / admin / viewer — ดูสิทธิ์ด้านล่าง |
| invited_by  | UUID REFERENCES auth.users(id)             | user ที่ invite เข้ามา                    |
| invited_at  | TIMESTAMPTZ DEFAULT now()                  |                                           |
| accepted_at | TIMESTAMPTZ                                | null = ยังไม่ได้ accept invitation        |
| UNIQUE      | (farm_id, user_id)                         | 1 user มีได้แค่ 1 role ต่อ 1 farm         |

| Role   | สิทธิ์                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------- |
| owner  | ทุกอย่าง รวมถึง billing, invite/remove members, delete farm, ย้าย device                       |
| admin  | จัดการ device, ตั้ง alert rules, ส่ง command, calibrate, ดูข้อมูลทั้งหมด — ไม่มีสิทธิ์ billing |
| viewer | ดูข้อมูล dashboard อย่างเดียว — ไม่สามารถส่ง command หรือเปลี่ยน config                        |

> **หมายเหตุ:** RLS policy สำหรับ farms: user มีสิทธิ์เข้าถึง farm ถ้า id อยู่ใน farm_members ของ farm นั้น (ไม่ว่า role จะเป็นอะไร) — การจำกัด action ตาม role ทำที่ Vercel API layer

### 6.3.17 Notification Logs

เก็บ log การส่ง notification ทุกครั้ง — ใช้ debug เมื่อลูกค้าบอกว่าไม่ได้รับแจ้งเตือน

| Field               | Type                                       | หมายเหตุ                                                  |
| ------------------- | ------------------------------------------ | --------------------------------------------------------- |
| id                  | UUID PRIMARY KEY DEFAULT gen_random_uuid() |                                                           |
| alert_event_id      | UUID REFERENCES alert_events(id)           | null ถ้าเป็น system notification ไม่ใช่ alert             |
| user_id             | UUID REFERENCES auth.users(id)             | ผู้รับ notification                                       |
| channel             | TEXT NOT NULL                              | line / email / web_push                                   |
| status              | TEXT NOT NULL                              | sent / failed / skipped (quiet hours)                     |
| sent_at             | TIMESTAMPTZ DEFAULT now()                  |                                                           |
| error_detail        | TEXT                                       | error message ถ้า status = failed                         |
| provider_message_id | TEXT                                       | LINE message ID หรือ Resend email ID — ใช้ track delivery |
| retry_count         | SMALLINT DEFAULT 0                         | จำนวนครั้งที่ retry หลัง fail                             |

> **หมายเหตุ:** Notification logs เก็บ 30 วัน — เพียงพอสำหรับ debug และ audit การแจ้งเตือน

## 6.4 API Routes

ทุก route ที่ require JWT ต้องส่ง Authorization: Bearer {token} header — token ได้จาก Supabase Auth

| สัญลักษณ์ | ความหมาย                                                               |
| --------- | ---------------------------------------------------------------------- |
| JWT       | ต้อง login — Supabase Auth JWT token                                   |
| SVC       | Service role key เท่านั้น — ใช้ใน Vercel server-side, ห้ามใช้ใน client |
| HMAC      | Webhook signature verification — ไม่ใช้ JWT                            |
| PUBLIC    | ไม่ต้อง auth — เข้าถึงได้ทุกคน                                         |

### Auth Routes — /api/auth

| Route                     | Method | Auth   | การทำงาน                                         |
| ------------------------- | ------ | ------ | ------------------------------------------------ |
| /api/auth/login           | POST   | PUBLIC | email + password → return JWT + refresh token    |
| /api/auth/register        | POST   | PUBLIC | สร้าง account ใหม่ + สร้าง user_profile เริ่มต้น |
| /api/auth/logout          | POST   | JWT    | revoke session                                   |
| /api/auth/me              | GET    | JWT    | return current user + farms ที่เป็น member       |
| /api/auth/refresh         | POST   | PUBLIC | refresh token → return JWT ใหม่                  |
| /api/auth/forgot-password | POST   | PUBLIC | ส่ง reset password email ผ่าน Resend             |

### Farm Routes — /api/farms

| Route      | Method | Auth | การทำงาน                                 |
| ---------- | ------ | ---- | ---------------------------------------- |
| /api/farms | GET    | JWT  | list farms ทั้งหมดที่ user เป็น member   |
| /api/farms | POST   | JWT  | สร้าง farm ใหม่ — body: {name, location} |

### Zone Routes — /api/zones

| Route      | Method | Auth              | การทำงาน                                                     |
| ---------- | ------ | ----------------- | ------------------------------------------------------------ |
| /api/zones | POST   | JWT (owner/admin) | สร้าง zone ใหม่ — body: {farm_id, name, water_type, species} |

### Device Routes — /api/devices

| Route                 | Method | Auth              | การทำงาน                                                   |
| --------------------- | ------ | ----------------- | ---------------------------------------------------------- |
| /api/devices          | GET    | JWT               | list devices ทั้งหมดของ farm (filter by farm_id, zone_id)  |
| /api/devices/register | POST   | JWT (owner/admin) | ลงทะเบียน device ใหม่ — body: {device_code, farm_id, name} |

### Alert Routes — /api/alerts

| Route              | Method | Auth              | การทำงาน                                                                              |
| ------------------ | ------ | ----------------- | ------------------------------------------------------------------------------------- |
| /api/alerts/rules  | GET    | JWT               | list alert rules ของ farm                                                             |
| /api/alerts/rules  | POST   | JWT (owner/admin) | สร้าง rule ใหม่ — body: {device_id, sensor, condition, threshold, duration, channels} |
| /api/alerts/events | GET    | JWT               | list alert events (filter: status, device_id, start, end)                             |

### OTA Routes — /api/ota

| Route               | Method | Auth | การทำงาน                                                         |
| ------------------- | ------ | ---- | ---------------------------------------------------------------- |
| /api/ota/releases   | GET    | JWT  | list firmware releases ทั้งหมด                                   |
| /api/ota/releases   | POST   | SVC  | upload firmware — body: {version, changelog, is_stable} + binary |
| /api/ota/push       | POST   | JWT (owner/admin) | push OTA ไปยัง device — body: {device_id, release_id} |
| /api/ota/push/batch | POST   | SVC  | push OTA ไปยังหลาย devices พร้อมกัน                              |

### Export & Report Routes — /api/export

| Route              | Method | Auth | การทำงาน                                          |
| ------------------ | ------ | ---- | ------------------------------------------------- |
| /api/export/jobs   | GET    | JWT  | list export jobs ทั้งหมดของ user พร้อม status + download URL |
| /api/export/report | POST   | JWT  | สร้าง PDF monthly report — body: {farm_id, month} |

### User Routes — /api/users

| Route                    | Method | Auth | การทำงาน                                            |
| ------------------------ | ------ | ---- | --------------------------------------------------- |
| /api/users/profile       | GET    | JWT  | ดู user profile + notification settings             |
| /api/users/profile       | PUT    | JWT  | แก้ไข display_name, timezone, language, quiet hours |
| /api/users/notifications | PUT    | JWT  | เปิด/ปิด notification channels (line, email, web)   |
| /api/users/line/link     | POST   | JWT  | link LINE account — body: {line_user_id}            |

### SIM Routes — /api/sim

| Route    | Method | Auth | การทำงาน                            |
| -------- | ------ | ---- | ----------------------------------- |
| /api/sim | GET    | JWT  | list SIM cards ของ farm พร้อม usage |

### Webhook Routes — /api/webhook

| Route               | Method | Auth | การทำงาน                                                     |
| ------------------- | ------ | ---- | ------------------------------------------------------------ |
| /api/webhook/mqtt   | POST   | HMAC | รับ telemetry จาก QStash — verify signature ก่อนทุกครั้ง     |
| /api/webhook/stripe | POST   | HMAC | รับ billing events จาก Stripe (payment, subscription update) |
| /api/webhook/omise  | POST   | HMAC | รับ billing events จาก Omise                                 |

### Cron Routes — /api/cron

| Route                        | Method | Auth | ความถี่      | การทำงาน                                            |
| ---------------------------- | ------ | ---- | ------------ | --------------------------------------------------- |
| /api/cron/stale-check        | GET    | SVC  | ทุก 15 นาที  | ตรวจ device offline > threshold → แจ้งเตือน         |
| /api/cron/daily-digest       | GET    | SVC  | ทุกวัน 07:00 | ส่ง daily summary ผ่าน LINE + Email                 |
| /api/cron/sim-expiry         | GET    | SVC  | ทุกวัน 09:00 | ตรวจ SIM ใกล้หมดอายุ → แจ้งเตือน 7 วันล่วงหน้า      |
| /api/cron/db-backup          | GET    | SVC  | ทุกวัน 03:00 | export tables → compress → upload Vercel Blob       |
| /api/cron/command-timeout    | GET    | SVC  | ทุก 15 นาที  | ตรวจ command pending > 24 ชม. → mark timeout        |
| /api/cron/cleanup-logs       | GET    | SVC  | ทุกวัน 02:00 | ลบ webhook_logs > 7 วัน, notification_logs > 30 วัน |
| /api/cron/notification-retry | GET    | SVC  | ทุก 30 นาที  | retry failed notifications (max 3 ครั้ง)            |
| /api/cron/data-usage         | GET    | SVC  | ทุกวัน 00:00 | คำนวณ data_usage รายเดือนจาก telemetry count        |

> **หมายเหตุ:** Cron routes ป้องกันด้วย CRON_SECRET environment variable — Vercel ส่ง Authorization: Bearer {CRON_SECRET} header ทุกครั้ง

### Real-time Routes — /api/sse

| Route                  | Method | Auth | การทำงาน                                              |
| ---------------------- | ------ | ---- | ----------------------------------------------------- |
| /api/sse/alerts        | GET    | JWT  | SSE stream — ส่ง event เมื่อมี alert ใหม่หรือ resolve |
| /api/sse/device-status | GET    | JWT  | SSE stream — ส่ง event เมื่อ device online/offline    |

### 6.4 เพิ่มเติม — Pagination Standard

ทุก route ที่ return list ใช้ cursor-based pagination ผ่าน query params มาตรฐานเดียวกัน

| Query Param | Type                         | ความหมาย                                              |
| ----------- | ---------------------------- | ----------------------------------------------------- |
| limit       | number (default 20, max 100) | จำนวน records ต่อหน้า                                 |
| cursor      | string (optional)            | cursor จาก response ก่อนหน้า — ถ้าไม่ส่งจะเริ่มจากต้น |
| order       | asc / desc (default desc)    | เรียงตาม created_at หรือ time                         |

Response format สำหรับ list routes:

### 6.4 เพิ่มเติม — Error Response Format

ทุก error response ใช้ format เดียวกัน — ช่วยให้ frontend handle error ได้ง่าย

| HTTP Status             | Error Code                        | เมื่อไหร่                                         |
| ----------------------- | --------------------------------- | ------------------------------------------------- |
| 400 Bad Request         | INVALID_PARAMS                    | request body หรือ query params ผิด format         |
| 401 Unauthorized        | INVALID_TOKEN                     | JWT หมดอายุหรือ invalid                           |
| 403 Forbidden           | INSUFFICIENT_ROLE                 | user มี role ไม่พอ เช่น viewer พยายาม ส่ง command |
| 404 Not Found           | DEVICE_NOT_FOUND / FARM_NOT_FOUND | resource ไม่มีหรือไม่มีสิทธิ์เข้าถึง (RLS)        |
| 409 Conflict            | DUPLICATE_DEVICE_CODE             | device_code ซ้ำ                                   |
| 422 Unprocessable       | COMMAND_REJECTED                  | command ถูกปฏิเสธโดย device                       |
| 429 Too Many Requests   | RATE_LIMIT_EXCEEDED               | เกิน rate limit — header: Retry-After             |
| 500 Internal Error      | INTERNAL_ERROR                    | server error — log ไว้ใน Sentry อัตโนมัติ         |
| 503 Service Unavailable | DEPENDENCY_UNAVAILABLE            | Supabase / HiveMQ / Redis down                    |

### 6.4 เพิ่มเติม — Rate Limits ต่อ Route

| Route Group        | Rate Limit               | หมายเหตุ                                      |
| ------------------ | ------------------------ | --------------------------------------------- |
| /api/webhook/mqtt  | ไม่จำกัด (QStash ควบคุม) | QStash retry เองอยู่แล้ว — ไม่ต้อง rate limit |
| /api/auth/login    | 5 req/นาที per IP        | ป้องกัน brute force                           |
| /api/auth/register | 3 req/นาที per IP        | ป้องกัน spam accounts                         |
| /api/sse/\*        | 5 connections/user       | ป้องกัน SSE connection flood                  |
| /api/export/\*     | 3 req/ชม. per user       | export ใช้ resources สูง                      |
| /api/ota/push      | 5 req/ชม. per user       | ป้องกัน OTA push ซ้ำๆ                         |
| /api/\* (ทั่วไป)   | 100 req/นาที per user    | global rate limit ผ่าน Upstash Redis          |

### 6.4 เพิ่มเติม — แก้ไข Routes

| Route            | การแก้ไข                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| /api/ota/push    | เปลี่ยน Auth จาก SVC เป็น JWT (owner/admin) — dashboard push OTA ได้โดยตรง, SVC ใช้สำหรับ batch push เท่านั้น |

> **หมายเหตุ:** Vercel Cron authentication: Vercel ส่ง Authorization: Bearer {CRON_SECRET} header อัตโนมัติ — ใช้ middleware ตรวจ header นี้ก่อน execute cron logic ทุกครั้ง ตัวอย่าง: if (req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET) return 401

# 7. Security

## 7.1 Device Security

### Transport Security

- TLS 1.2 สำหรับ MQTT connection ทั้งหมด — ไม่มี plaintext MQTT
- TLS 1.2 สำหรับ OTA firmware download ผ่าน HTTPS (mbedTLS)
- Certificate pinning ใน firmware — ป้องกัน MITM attack

### Flash Encryption + Secure Boot

- Flash Encryption (ESP32-S3): NVS partition ที่เก็บ MQTT credentials + calibration data จะ encrypted อัตโนมัติ
- Secure Boot v2: sign firmware binary ด้วย RSA-3072 key — bootloader verify signature ก่อน execute ทุกครั้ง
- ต้อง enable ตอน production flash เท่านั้น — ไม่สามารถ enable ทีหลังผ่าน OTA ได้ (ดูรายละเอียดใน section 14)
- OTA firmware ที่ push ทีหลังต้อง sign ด้วย key เดียวกัน — ถ้า signature ไม่ตรง device reject และ rollback

### MQTT Credentials Management

| ขั้นตอน         | รายละเอียด                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Generate        | Server generate unique username + password ต่อ device ตอน provisioning — ใช้ crypto.randomBytes(32) |
| Deliver         | ส่งผ่าน BLE provisioning บน mobile PWA/Web Bluetooth (encrypted) หรือ flash ตอนผลิตด้วย USB — ห้ามส่งผ่าน HTTP plaintext |
| Store on device | เก็บใน NVS partition ที่ Flash Encrypted — ไม่สามารถ read ได้ถ้าไม่มี encryption key                |
| Store on server | เก็บใน Supabase devices table (hashed) + HiveMQ Cloud — ไม่เก็บ plaintext password                  |
| Rotate          | ถ้า device ถูก compromise → revoke credentials ผ่าน HiveMQ REST API + provision ใหม่ผ่าน dashboard  |

## 7.2 API Security

### Authentication

| ประเภท              | รายละเอียด                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| JWT (Supabase Auth) | Access token อายุ 1 ชม. — ต้อง refresh ก่อนหมดอายุ                                                       |
| Refresh Token       | อายุ 7 วัน — rotation policy: ทุกครั้งที่ใช้ refresh token จะได้ token ใหม่ (เก่าถูก revoke)             |
| Service Role Key    | ไม่มี expiry — ใช้เฉพาะใน Vercel server-side environment variables เท่านั้น ห้ามใช้ใน client             |
| HMAC Webhook        | HMAC-SHA256(timestamp + . + body, secret) — reject ถ้า timestamp เก่ากว่า 5 นาที (ป้องกัน replay attack) |
| Cron Secret         | Static secret ใน Vercel env — Vercel ส่ง Authorization header อัตโนมัติ                                  |

### Authorization

- Row Level Security (RLS) ใน Supabase — user เห็นเฉพาะ farm ที่เป็น member
- Role-based access ที่ Vercel API layer — Viewer ส่ง command ไม่ได้, Admin ลบ farm ไม่ได้
- RLS + API layer ทำงานร่วมกัน — ถึงแม้ bypass API layer ได้ RLS ยังป้องกันอยู่

### CORS Policy

| Environment       | Allowed Origins                                                 |
| ----------------- | --------------------------------------------------------------- |
| Production        | https://aquasense.io เท่านั้น — ไม่มี wildcard (\*)             |
| Staging           | https://staging.aquasense.io                                    |
| Development       | http://localhost:3000                                           |
| Webhook endpoints | ไม่มี CORS — รับจาก server-to-server เท่านั้น ตรวจด้วย HMAC แทน |

### Rate Limiting

- Global: 100 req/นาที per user — ผ่าน Upstash Redis sliding window
- Per device webhook: 1 msg/10 วินาที — reject excess และ log
- Auth endpoints: 5 req/นาที per IP — ป้องกัน brute force
- Export/OTA: จำกัดต่างหาก (ดู section 6.4)

## 7.3 Secret Management

ระบบมี secrets หลายประเภท — ต้องจัดการอย่างเป็นระบบเพื่อป้องกัน leak

| Secret                          | เก็บที่ไหน                                | Rotate เมื่อไหร่                                         |
| ------------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| Supabase Service Role Key       | Vercel Environment Variables (Production) | ทุก 6 เดือน หรือถ้าสงสัยว่า leak                         |
| HMAC Webhook Secret             | Vercel Environment Variables              | ทุก 6 เดือน หรือถ้าสงสัยว่า leak                         |
| CRON_SECRET                     | Vercel Environment Variables              | ทุก 6 เดือน                                              |
| Stripe Webhook Secret           | Vercel Environment Variables              | ทุกครั้งที่ regenerate ใน Stripe dashboard               |
| Omise Secret Key                | Vercel Environment Variables              | ทุก 6 เดือน                                              |
| Firmware Signing Key (RSA-3072) | HSM / HashiCorp Vault                     | ไม่ rotate — ถ้า compromise ต้อง re-flash device ทั้งหมด |
| MQTT Credentials (per device)   | Supabase DB (hashed) + HiveMQ             | เมื่อ device ถูก compromise หรือ decommission            |
| Resend API Key                  | Vercel Environment Variables              | ทุก 6 เดือน                                              |
| LINE Channel Secret             | Vercel Environment Variables              | ทุก 6 เดือน                                              |

> **หมายเหตุ:** ห้ามเก็บ secrets ใน .env files ที่ commit ใน git เด็ดขาด — ใช้ .env.local สำหรับ dev และ Vercel Environment Variables สำหรับ production เท่านั้น

## 7.4 Data Security

| ชั้น               | มาตรการ                                                              |
| ------------------ | -------------------------------------------------------------------- |
| In Transit         | TLS 1.2 ทุก connection — MQTT, HTTPS, WebSocket                      |
| At Rest (Device)   | Flash Encryption ESP32-S3 — NVS + firmware partition                 |
| At Rest (Database) | Supabase managed encryption at rest (AES-256)                        |
| At Rest (Backups)  | Vercel Blob encrypted at rest — access ผ่าน signed URL เท่านั้น      |
| Sensitive fields   | MQTT password เก็บแบบ hashed ใน DB — ไม่สามารถ recover plaintext ได้ |

## 7.5 Dependency & Vulnerability Management

- GitHub Actions รัน npm audit ทุก PR — block merge ถ้ามี high/critical vulnerability
- Dependabot enable ใน GitHub repo — auto PR เมื่อมี security patch
- ESP-IDF component dependencies ตรวจด้วย idf.py check-requirements ใน CI/CD
- Firmware binary scan ด้วย binwalk ก่อน sign — ตรวจหา hardcoded secrets

## 7.6 Penetration Testing Plan

| Phase                     | ขอบเขต                                             | เมื่อไหร่                        |
| ------------------------- | -------------------------------------------------- | -------------------------------- |
| Phase 2 (ก่อน field test) | API security, Auth bypass, RLS bypass, MQTT broker | ก่อนติดตั้ง device จริง          |
| Phase 3 (ก่อน launch)     | Full pentest — Web app, API, firmware, hardware    | ก่อน commercial launch 4 สัปดาห์ |
| Phase 4 (ongoing)         | ทุก 1 ปี หรือหลัง major feature release            | หลัง launch                      |

> **หมายเหตุ:** สำหรับ Phase 2 ทำ self-pentest ก่อนโดยใช้ OWASP ZAP + Burp Suite Community Edition เพื่อประหยัดค่าใช้จ่าย — Phase 3 ควรจ้าง external security firm

# 8. Error Handling & Fault Tolerance

> **หมายเหตุ:** หลักการ: ไม่มี error ตัวไหนทำให้เครื่องตายถาวรได้ ทั้งฝั่ง firmware และ backend ต้องมีทาง recovery อัตโนมัติทุกกรณี

## 8.1 Firmware — Sensor Failures

| สถานการณ์                | Detection                             | Response                              | Recovery                                                |
| ------------------------ | ------------------------------------- | ------------------------------------- | ------------------------------------------------------- |
| DS18B20 ไม่ตอบ           | ROM address ไม่ respond               | ส่ง null + flag sensor_fault          | Retry 3 ครั้ง (delay 100ms) → ส่ง null + แจ้ง dashboard |
| DS18B20 คืนค่า 85.0°C    | ค่า default เมื่อ conversion ไม่เสร็จ | ทิ้งค่า ไม่ส่ง                        | เพิ่ม conversion wait time 750ms → 1,000ms              |
| DS18B20 ค่าเกิน range    | < -5°C หรือ > 50°C                    | ส่งค่าจริง + flag rate_exceeded       | ถ้าผิด 5 รอบติด → mark sensor degraded                  |
| SEN0600 RS485 timeout    | Modbus timeout 500ms                  | สงสัย sensor เสีย/สายหลุด             | ตัดไฟ MOSFET 2 วินาที → เปิดใหม่ → retry 3 ครั้ง        |
| SEN0600 CRC error        | Modbus CRC fail                       | สงสัย noise/wiring issue              | Retry ทันที max 3 ครั้ง → ส่ง null + flag               |
| GPS ไม่มี fix (> 3 นาที) | NMEA parse แต่ไม่มี valid fix         | ส่ง last_lat/lng ที่เก็บไว้ หรือ null | ไม่หยุดส่ง sensor data — GPS optional                   |
| GPS drift (accuracy ต่ำ) | HDOP > 5.0 จาก NMEA                   | ส่ง GPS + flag gps_poor_accuracy      | Dashboard แสดง marker สีเหลืองแทนสีเขียว                |
| Stuck value              | ค่าเดิมทุกประการ 10 รอบ               | flag stuck_sensor                     | Log + แจ้ง dashboard ให้ตรวจสอบ sensor                  |

## 8.2 Firmware — 4G / Connectivity Failures

| สถานการณ์                        | Response                     | Recovery                                                       |
| -------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| ไม่มี signal (RSSI = 99)         | Buffer data ลง NVS flash     | ส่งรวมเป็น batch รอบถัดไปที่ connect ได้                       |
| MQTT connect timeout > 15 วินาที | ตัด modem power → restart    | Retry 1 ครั้ง → ถ้ายังไม่ได้ buffer + sleep                    |
| MQTT publish fail (QoS 1 no ACK) | Retry 2 ครั้ง                | Buffer ถ้ายังไม่ได้                                            |
| Modem ไม่ตอบ AT command          | UART timeout 5 วินาที        | Hard reset (PWRKEY toggle) → retry                             |
| SIM หมดเงิน / ล็อค               | AT+CPIN return ERROR         | LED กระพริบแดง 2 วินาที — ส่ง status ครั้งถัดไปที่ connect ได้ |
| Buffer เต็ม (NVS ~500 readings)  | ตรวจ NVS free space          | ลบข้อมูลเก่าสุด (circular buffer) — ไม่หยุดทำงาน               |
| Battery ต่ำ < 3.4V ก่อนส่ง       | Fuel gauge check ก่อนเปิด 4G | ข้ามการส่งรอบนั้น — บันทึก NVS เท่านั้น (ดู section 4.4)       |

> **หมายเหตุ:** Device-side buffering รองรับ offline ได้ ~41 ชั่วโมง (@ interval 5 นาที) — ถ้า backend ล่มภายใน 41 ชม. จะไม่สูญเสียข้อมูลเลย

## 8.3 Firmware — Watchdog & Safe Mode

### Watchdog Timers (2 ชั้น)

| ชั้น   | Type                     | Timeout   | Action เมื่อ trigger                                           |
| ------ | ------------------------ | --------- | -------------------------------------------------------------- |
| ชั้น 1 | Task Watchdog (TWDT)     | 30 วินาที | reboot — ป้องกัน firmware hang ใน task ใดก็ตาม                 |
| ชั้น 2 | Hardware Watchdog (MWDT) | 60 วินาที | hardware reset — ป้องกัน software watchdog ถูก disable โดย bug |

### Boot & Crash Recovery

| จำนวน crash           | สถานะ               | Firmware ทำอะไร                                                                 |
| --------------------- | ------------------- | ------------------------------------------------------------------------------- |
| 1-4 ครั้ง             | Normal recovery     | reboot → resume normal operation                                                |
| 5 ครั้งติดกัน         | Safe Mode           | ส่งแค่ diagnostic status ทุก 15 นาที — ไม่อ่าน sensor เพื่อหลีกเลี่ยง crash ซ้ำ |
| Safe Mode + ชาร์จแล้ว | Auto exit safe mode | ถ้า battery charge > 50% + uptime > 1 ชม. → reset crash_count → กลับ normal     |
| Safe Mode + command   | Manual exit         | dashboard ส่ง safe_mode_clear command → reset crash_count → reboot              |

> **หมายเหตุ:** crash_count เก็บใน RTC memory (ไม่ถูกล้างเมื่อ reboot) — เก็บใน NVS ด้วยสำรอง ถ้า RTC memory reset จาก power loss

## 8.4 Firmware — Power Failures

| สถานการณ์                         | Detection                      | Response                                                          |
| --------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Brownout ขณะส่ง 4G (voltage drop) | ESP32 brownout detector (2.6V) | Auto-reboot → resume จาก RTC state                                |
| แบตวิกฤต < 5%                     | MAX17048 fuel gauge            | ส่ง critical_battery alert ครั้งสุดท้าย → deep sleep ถาวร รอชาร์จ |
| ชาร์จแล้วตื่นกลับมา               | Boot check voltage > 3.5V      | Resume normal operation + ส่ง power_restored status               |
| Voltage drop ขณะเขียน NVS         | Fuel gauge check ก่อน write    | ข้าม write → deep sleep ทันที ป้องกัน NVS corrupt                 |

## 8.5 Backend — API & Service Failures

| สถานการณ์                        | Response                                 | Recovery                                                          |
| -------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Supabase write fail              | Retry 2 ครั้ง (100ms backoff)            | ถ้ายังไม่ได้ push เข้า Redis dead letter queue → manual review    |
| Supabase read timeout            | Return cached value จาก Redis            | Fallback gracefully — dashboard แสดงข้อมูล cache แทน              |
| Redis down                       | Fallback อ่านจาก Supabase โดยตรง         | ช้ากว่า แต่ไม่ตาย — log warning ไปที่ Sentry                      |
| QStash delivery fail             | Auto-retry 3 ครั้ง (exponential backoff) | Dead letter queue → Sentry alert → manual review                  |
| HiveMQ down (ส่ง command ไม่ได้) | บันทึก command_log status: pending       | Retry เมื่อ HiveMQ กลับมา — device รับผ่าน persistent session     |
| Vercel cold start timeout        | QStash retry อัตโนมัติ                   | ไม่สูญหาย — QStash queue ข้อมูลไว้                                |
| LINE API down (ส่ง alert ไม่ได้) | Retry 3 ครั้ง (exponential backoff)      | Log failed notification → retry ผ่าน /api/cron/notification-retry |
| Resend down (email fail)         | Retry 3 ครั้ง                            | Log failed notification → retry                                   |
| Stripe webhook fail              | QStash retry อัตโนมัติ                   | billing event ไม่หาย — QStash queue ไว้                           |

## 8.6 Backend — Data Integrity

| สถานการณ์                         | Response                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------ |
| MQTT webhook มาซ้ำ (duplicate)    | ใช้ ts + device_id เป็น idempotency key ใน Redis (TTL 10 นาที) → ignore ถ้าซ้ำ |
| Payload format ผิด (schema error) | Log error + ignore → ไม่เก็บลง DB → Sentry alert                               |
| Timestamp อยู่ในอนาคต > 5 นาที    | Reject → log → Sentry alert (อาจเป็น clock issue)                              |
| Timestamp เก่ากว่า 48 ชม.         | Reject → log (buffered data เกิน limit)                                        |
| Device ส่งข้อมูล rate สูงผิดปกติ  | Rate limit 1 msg/10 วินาที per device → reject excess + log                    |
| Alert trigger ซ้ำ (duplicate)     | ตรวจ active alert exists ก่อน create → ไม่สร้าง duplicate event                |

# 11. ต้นทุน Infrastructure รายเดือน (50 devices)

| Service            | Plan                           | ราคา/เดือน              |
| ------------------ | ------------------------------ | ----------------------- |
| HiveMQ Cloud       | Standard (100 connections)     | Free → $25              |
| Supabase           | Pro (8GB DB)                   | $25                     |
| Upstash Redis      | Pay-per-use                    | ~$5                     |
| Upstash QStash     | Pay-per-use (~14,400 msgs/day) | ~$4                     |
| Vercel             | Pro                            | $20                     |
| LINE Messaging API | Paid plan (planning estimate) | ~150 THB                |
| รวม                |                                | ~$83/เดือน (~3,000 THB) |

> **หมายเหตุ:** Revenue จาก 50 devices @ 299 THB/เดือน = 14,950 THB/เดือน — Net margin จาก SaaS: ~80%

# 16. Disaster Recovery & Backup

## 16.1 Database Backup Strategy

| ชั้น | วิธี                          | ความถี่                         | Retention                   |
| ---- | ----------------------------- | ------------------------------- | --------------------------- |
| 1    | Supabase automated backup     | ทุกวัน (built-in)               | 7 วัน (free) / 30 วัน (Pro) |
| 2    | PITR (Point-in-Time Recovery) | Continuous (Pro plan)           | 7 วัน                       |
| 3    | Custom backup Vercel Blob     | ทุกวัน เวลา 03:00 (Vercel Cron) | 90 วัน                      |

## 16.2 Recovery Plan

| สถานการณ์           | RTO         | RPO    | วิธี                                          |
| ------------------- | ----------- | ------ | --------------------------------------------- |
| Supabase corruption | 1 ชม.       | 24 ชม. | Restore from backup หรือ PITR                 |
| Supabase outage     | รอ Supabase | 0      | Device buffer data ส่งเมื่อ DB กลับมา         |
| Vercel outage       | รอ Vercel   | 0      | QStash queue data deliver เมื่อ Vercel กลับมา |
| HiveMQ outage       | รอ HiveMQ   | 0      | Device buffer ใน NVS ส่งเมื่อ broker กลับมา   |
| Complete data loss  | 4-8 ชม.     | 24 ชม. | Restore จาก Vercel Blob backup                |

> **หมายเหตุ:** Key Insight: Device-side buffering (~41 ชม.) คือ natural disaster recovery — ถ้า backend ล่ม ≤ 41 ชม. จะไม่สูญเสียข้อมูลเลย

# 17. Mobile-First UX / Dashboard Design

## 17.1 ทำไมต้อง Mobile-First

- ลูกค้าใช้ smartphone เป็นหลัก ไม่ใช่ PC/laptop
- ดู dashboard ตอนอยู่ที่บ่อ (outdoor, แสงจ้า)
- ต้องการข้อมูลเร็ว สรุปง่าย ไม่ซับซ้อน

## 17.2 Design Principles

| หลักการ                       | รายละเอียด                                                     |
| ----------------------------- | -------------------------------------------------------------- |
| Mobile-responsive ตั้งแต่ MVP | ไม่ใช่ desktop-first แล้วค่อย shrink                           |
| ภาษาไทยทั้งหมด                | รวมถึง error messages, tooltips, units                         |
| Large touch targets           | ปุ่มใหญ่ ≥ 48px เหมาะกับนิ้วเปียก                              |
| High contrast                 | อ่านได้ในแสงจ้า รองรับ dark mode                               |
| Summary first                 | หน้าแรกแสดงสถานะรวม drill down เมื่อต้องการ                    |
| PWA (Progressive Web App)     | ติดตั้งที่ home screen ได้ offline mode แสดง last known values |
| GPS Map                       | แสดงตำแหน่งทุ่น real-time บน map เฉพาะ SB-00                   |

## 17.3 หน้าหลักที่ต้องมี

| หน้า               | ฟีเจอร์                                                   |
| ------------------ | --------------------------------------------------------- |
| Dashboard Overview | สถานะ device ทั้งหมด battery online/offline alert summary |
| Device Detail      | กราฟ temperature + turbidity GPS map ตั้ง interval        |
| Alert Management   | ตั้ง threshold ประวัติ alert acknowledge                  |
| Settings           | ชื่ออุปกรณ์ farm info notification channels (LINE/Email)  |
| Calibration        | กด recalibrate turbidity ดูประวัติ calibration            |

## 17.4 User Onboarding

- วิดีโอแนะนำ (YouTube 5 นาที): ติดตั้งเครื่อง scan QR ดู dashboard
- คู่มือภาพ (PDF): step-by-step พร้อมรูปถ่ายจริง ภาษาง่าย
- LINE OA Chatbot: ถามตอบปัญหาเบื้องต้น
- ช่วงแรก: โทรหาลูกค้าหลังติดตั้ง 1 สัปดาห์ เก็บ feedback

# 18. SIM & Connectivity Management

## 18.1 APN Configuration

| Provider  | APN      | Username | Password |
| --------- | -------- | -------- | -------- |
| AIS       | internet | ais      | ais      |
| TRUE      | real     | true     | true     |
| DTAC      | dtac     | (empty)  | (empty)  |
| NT Mobile | ntworld  | (empty)  | (empty)  |

Firmware จัดการ APN อัตโนมัติโดยอ่าน MCC/MNC จาก SIM — ไม่ต้องตั้งค่า SIM เอง

## 18.2 Data Usage Estimation

| รายการ                  | ปริมาณ                    |
| ----------------------- | ------------------------- |
| Per cycle (5 นาที)      | ~880 bytes                |
| Per day (288 cycles)    | ~247 KB/วัน               |
| Per month               | ~7.4 MB/เดือน             |
| OTA update (occasional) | ~1 MB ต่อครั้ง            |
| รวมประมาณ               | 10-15 MB/เดือน ต่อเครื่อง |

## 18.3 SIM Recommendation

| Option                  | ราคา/เดือน | Data    | หมายเหตุ                     |
| ----------------------- | ---------- | ------- | ---------------------------- |
| AIS SIM2FLY IoT (แนะนำ) | ~30 THB    | 10 MB   | IoT plan ไม่มีเสียง เหมาะสุด |
| TRUE IoT SIM            | ~29 THB    | 10 MB   | IoT plan                     |
| DTAC IoT                | ~35 THB    | 15 MB   | IoT plan                     |
| AIS Prepaid (ปกติ)      | ~59 THB    | 100 MB+ | หาซื้อง่าย แต่แพงกว่า        |

> **หมายเหตุ:** แนะนำ: ติดต่อ AIS/TRUE ขอ IoT SIM bulk (50+ SIM) ราคาพิเศษ ~20-25 THB/เดือน + managed SIM portal

## 18.4 SIM Connectivity Monitoring

- Device offline > 6 ชม. + battery > 20% สงสัย SIM issue แจ้ง LINE
- Dashboard แสดง: operator, signal strength, data usage per device
- แจ้งเตือนอัตโนมัติเมื่อ SIM ใกล้หมดอายุ (Cron job ทุกวัน)

# 21. Logging & Diagnostics

## 21.1 Device-side Logging

Device ส่ง diagnostic payload ทุก 1 ชั่วโมง หรือเมื่อมี error — ช่วย debug ปัญหาได้โดยไม่ต้องไปที่บ่อ

| Field                 | ความหมาย                                                  |
| --------------------- | --------------------------------------------------------- |
| type: diag            | บอกว่าเป็น diagnostic payload ไม่ใช่ telemetry            |
| uptime_sec            | เครื่องทำงานมานานแค่ไหน (วินาที)                          |
| boot_count            | รีบูตไปแล้วกี่ครั้ง                                       |
| crash_count           | crash ใน session ปัจจุบัน                                 |
| reset_reason          | สาเหตุที่ reboot: timer_wakeup, brownout, watchdog, panic |
| heap_free             | RAM ว่างเหลือ (bytes) — ถ้าน้อยกว่า 50KB ควรตรวจสอบ       |
| nvs_free_pct          | Flash NVS ว่างเหลือ (%) — ถ้า < 20% buffer จะเต็มเร็ว     |
| buf_count             | จำนวน readings ที่ buffer ค้างอยู่ยังไม่ได้ส่ง            |
| clock_last_sync       | Unix timestamp ที่ sync NTP ล่าสุด                        |
| sensor_status         | สถานะแต่ละ sensor: ok / degraded / fault                  |
| modem.connect_time_ms | ใช้เวลาเชื่อม 4G กี่ ms — ถ้า > 15,000 สัญญาณอ่อน         |
| modem.fail_count_24h  | 4G connect ล้มเหลวกี่ครั้งใน 24 ชม.                       |
| power.bat_mv          | แรงดันแบต (mV) ค่าจริงจาก fuel gauge                      |
| power.charge_state    | charging / discharging                                    |
| errors_24h            | รายการ error codes ใน 24 ชม. ที่ผ่านมา                    |

## 21.2 Remote Debug Commands

| Command    | การทำงาน                                          |
| ---------- | ------------------------------------------------- |
| dump_log   | ส่ง error log ทั้งหมดจาก NVS flash กลับมา         |
| read_raw   | อ่าน raw sensor values + OneWire scan results     |
| modem_info | ส่งข้อมูล AT+COPS?, AT+CSQ, AT+CPIN?, IMEI, ICCID |
| debug_mode | ส่งข้อมูลทุก 1 นาที + raw values เป็นเวลาที่กำหนด |
| read_now   | อ่านค่า sensor และส่งทันที ไม่รอ interval         |

## 21.3 Server-side Monitoring

- Dashboard แสดง diagnostic data แยก tab จาก sensor data
- แจ้งเตือนถ้า crash_count > 3 ใน 24 ชม.
- แจ้งเตือนถ้า buf_count > 50 (device ออฟไลน์นาน)
- แจ้งเตือนถ้า heap_free < 50,000 bytes
- แจ้งเตือนถ้า modem.fail_count_24h > 10

# 22. Multi-Device Farm Management

## 22.1 โครงสร้าง Multi-tenant

| ระดับ               | ความหมาย     | ตัวอย่าง                     |
| ------------------- | ------------ | ---------------------------- |
| Organization / User | เจ้าของบัญชี | นาย ก เจ้าของฟาร์ม           |
| Farm                | ฟาร์มหรือบ่อ | ฟาร์มหอยแครงสมุทรสาคร        |
| Zone                | โซนในฟาร์ม   | บ่อที่ 1, บ่อที่ 2, บ่อทดลอง |
| Device (SB-00)      | ทุ่นใน zone  | SB00-001, SB00-002           |

- 1 farm = 1 tenant — RLS ป้องกัน data leak ระหว่าง tenant
- ผู้ใช้สามารถมีหลาย farm
- Device ผูกกับ zone → ย้าย zone ได้
- Subscription ผูกกับ farm

## 22.2 Dashboard Multi-device View

- Overview map แสดงตำแหน่ง SB-00 ทุกตัวในฟาร์มพร้อมกัน
- Status summary: กี่ตัว online, กี่ตัว alert, กี่ตัวแบตต่ำ
- เปรียบเทียบค่า sensor ระหว่าง zone แบบ overlay chart
- Alert รวมทุก device ใน farm เดียวกัน

## 22.3 Team Management

| Role   | สิทธิ์                                                 |
| ------ | ------------------------------------------------------ |
| Owner  | ทุกอย่าง รวมถึง billing, invite members, delete farm   |
| Admin  | จัดการ device, alert rules, calibrate, ดูข้อมูลทั้งหมด |
| Viewer | ดูข้อมูลได้อย่างเดียว ไม่ส่ง command                   |

# 23. Data Export & Reporting

## 23.1 Export Formats

| Format     | ข้อมูลที่ export                         | ใช้เมื่อ                          |
| ---------- | ---------------------------------------- | --------------------------------- |
| CSV        | Raw telemetry + hourly aggregate         | วิเคราะห์ใน Excel/Python          |
| PDF Report | สรุปรายเดือน: กราฟ, สถิติ, alert history | ส่งให้ผู้บริหาร/นักวิจัย          |
| JSON       | Raw data via API                         | นักพัฒนา, integration กับระบบอื่น |

## 23.2 Export Options ใน Dashboard

- เลือก device + ช่วงวันที่ + sensor fields ที่ต้องการ
- Export raw (ทุก 5 นาที) หรือ hourly average
- รองรับ timezone: Asia/Bangkok (UTC+7)
- ไฟล์ใหญ่ (> 30 วัน) generate ใน background แล้ว notify ทาง LINE/Email

## 23.3 Automated Reports

| Report               | ความถี่            | ส่งไปที่           |
| -------------------- | ------------------ | ------------------ |
| Daily Summary        | ทุกวัน 07:00       | LINE + Email       |
| Weekly Digest        | ทุกวันจันทร์ 07:00 | Email              |
| Monthly Report (PDF) | วันที่ 1 ของเดือน  | Email              |
| Alert History        | on-demand          | Dashboard + Export |

# 24. Alert System (ละเอียด)

## 24.1 Alert Rule Types

| ประเภท            | ตัวอย่าง                             | หมายเหตุ               |
| ----------------- | ------------------------------------ | ---------------------- |
| Threshold — Above | Temperature > 33°C                   | แจ้งทันทีที่เกิน       |
| Threshold — Below | Temperature < 20°C                   |                        |
| Rate of Change    | Turbidity เพิ่ม > 200 NTU ใน 15 นาที | ตรวจจับน้ำขุ่นกะทันหัน |
| Duration          | Temperature > 32°C นานกว่า 30 นาที   | กรอง false alarm       |
| Device Offline    | ไม่ได้รับข้อมูลนาน > 1 ชม.           |                        |
| Battery Low       | Battery < 15%                        |                        |
| Sensor Fault      | sensor_fault flag ถูก set            |                        |

## 24.2 Alert Flow

1. ข้อมูลใหม่เข้า → ตรวจ alert rules ทั้งหมดของ device
1. Threshold ถูกละเมิด → ตรวจว่ามี active alert อยู่แล้วหรือไม่
1. ถ้าไม่มี → ตรวจ duration requirement (ต้องเกิดนาน N นาทีก่อนแจ้ง)
1. Duration ผ่าน → สร้าง alert event + ส่ง notification
1. เมื่อค่ากลับมาปกติ → resolve alert event อัตโนมัติ
1. ผู้ใช้ acknowledge alert ได้จาก dashboard

## 24.3 Notification Channels

| Channel            | รายละเอียด                                | ค่าใช้จ่าย                   |
| ------------------ | ----------------------------------------- | ---------------------------- |
| LINE Messaging API | ส่ง push message ไป LINE OA ของ AquaSense | free tier ก่อน / paid plan ~150 THB/mo (planning estimate; re-check ก่อน commercial launch) |
| Email (Resend)     | ส่ง email แจ้งเตือน                       | Free tier 3,000 emails/เดือน |
| Web Push           | แจ้งเตือนบน browser/PWA                   | ฟรี                          |
| In-app             | แสดงใน dashboard notification bell        | ฟรี                          |

> **หมายเหตุ:** LINE Notify ถูก deprecated แล้ว — ใช้ LINE Messaging API แทน ต้องสร้าง LINE Official Account (OA) สำหรับ AquaSense

## 24.4 Alert Notification Template (LINE)

| ส่วน         | ตัวอย่าง                                |
| ------------ | --------------------------------------- |
| Header       | AquaSense Alert — อุณหภูมิน้ำสูงผิดปกติ |
| Device       | SB00-001 — บ่อที่ 1                     |
| ค่าที่วัดได้ | Temperature: 34.5°C (threshold: 33°C)   |
| เวลา         | 14:35 น. 22/03/2569                     |
| Action       | กดดูรายละเอียด → link ไป dashboard      |

# 27. Testing Strategy

> **หมายเหตุ:** 3 phases ของการทดสอบ: Unit Test (lab) → Integration Test (system) → Field Test (บ่อจริง)
>
> Field test 7 วันในเอกสาร roadmap หมายถึง engineering field test ปลาย Phase 1 ส่วน section 27.3 ด้านล่างคือ pilot validation 30 วันก่อน commercial launch — เป็นคนละรอบกัน

## 27.1 Phase 1 — Unit Testing (Lab)

### Firmware Unit Tests

| Test Case            | วิธีทดสอบ                               | ผ่านเมื่อ                            |
| -------------------- | --------------------------------------- | ------------------------------------ |
| DS18B20 อ่านค่าได้   | จุ่มใน ice water (0°C) + น้ำร้อน (50°C) | ค่าต่างจาก reference ≤ 0.5°C         |
| SEN0600 RS485 Modbus | ส่ง Modbus request, ตรวจ CRC            | ได้ response ถูกต้อง, CRC pass       |
| GPS fix              | ทดสอบ outdoor                           | ได้ fix ใน 3 นาที, accuracy ≤ 5m     |
| MQTT connect + send  | ทดสอบกับ HiveMQ Cloud                   | connect < 10 วินาที, data ถึง broker |
| Deep sleep current   | วัดกระแส multimeter                     | < 2mA ระหว่าง sleep                  |
| MOSFET switch        | วัด V_SNS ด้วย multimeter               | 3.3V เมื่อ ON, < 0.1V เมื่อ OFF      |
| NTP sync             | เปรียบเทียบกับ reference clock          | drift ≤ 2 วินาที                     |
| OTA update           | push firmware ใหม่ผ่าน MQTT             | flash สำเร็จ, boot ปกติ              |
| Watchdog reset       | จำลอง firmware hang                     | reboot ภายใน 30 วินาที               |
| Buffer + flush       | ตัด 4G แล้วต่อใหม่                      | ข้อมูลที่ buffer ส่งครบ              |

## 27.2 Phase 2 — Integration Testing (System)

### End-to-End Data Flow

| Test Case            | วิธีทดสอบ                        | ผ่านเมื่อ                            |
| -------------------- | -------------------------------- | ------------------------------------ |
| Device → MQTT → DB   | ส่งข้อมูลจริง ตรวจใน Supabase    | ข้อมูลถึง DB ใน < 30 วินาที          |
| Dashboard real-time  | ดู dashboard ขณะ device ส่ง      | ค่าอัพเดตภายใน 5 วินาที              |
| set_interval command | เปลี่ยน interval จาก dashboard   | device รับและปรับทันทีใน cycle ถัดไป |
| Alert trigger        | ทำให้ temperature เกิน threshold | LINE + dashboard แจ้งใน < 2 นาที     |
| Device offline alert | ปิด device 1 ชม.                 | แจ้งเตือน offline ภายใน 70 นาที      |
| Battery alert        | จำลอง battery < 15%              | แจ้งเตือน low battery ผ่าน LINE      |
| OTA via dashboard    | กด OTA update ใน dashboard       | device อัพเดตและ online กลับมา       |
| Multi-device         | ทดสอบ 3 device พร้อมกัน          | ข้อมูลแยก device ถูกต้อง ไม่ปนกัน    |
| GPS map              | ย้าย device ดู map               | ตำแหน่งอัพเดตบน map ถูกต้อง          |

## 27.3 Phase 3 — Field Testing (บ่อจริง)

ทดสอบ 3-5 เครื่อง ในบ่อจริง 1 เดือน ในรอบ pilot validation ก่อน commercial launch

| หัวข้อทดสอบ                 | ระยะเวลา  | สิ่งที่ต้องตรวจ                       |
| --------------------------- | --------- | ------------------------------------- |
| ความทนทาน outdoor           | 1 เดือน   | enclosure ไม่รั่ว, PCB ไม่มีน้ำเข้า   |
| Battery runtime จริง        | 1 เดือน   | เกณฑ์ผ่านขั้นต่ำ ≥ 12 วัน, stretch goal 14-16 วัน |
| 4G signal ในพื้นที่         | 1 สัปดาห์ | ทดสอบ AIS/TRUE/DTAC ว่าตัวไหนดีสุด    |
| Turbidity calibration drift | 2 สัปดาห์ | ค่า drift หลัง 2 สัปดาห์มากแค่ไหน     |
| GPS accuracy                | 1 สัปดาห์ | ตำแหน่งถูกต้องใน map ≤ 5 เมตร         |
| ทุ่นลอยในสภาพจริง           | 1 เดือน   | ไม่จม, ไม่พลิก, กล่องอยู่เหนือน้ำ     |
| น้ำเค็ม/น้ำจืด              | 1 เดือน   | connector และ seal ไม่กัดกร่อน        |
| User experience             | 1 เดือน   | เก็บ feedback เกษตรกร — ใช้งานง่ายไหม |

> **หมายเหตุ:** Field test สำคัญที่สุด — ปัญหาหลายอย่างจะเจอเฉพาะในสนาม เช่น GPS multipath ใกล้ต้นไม้, 4G signal อ่อนกลางทุ่ง, สาหร่ายเกาะ sensor

## 27.4 Regression Testing (หลัง OTA Update)

- ทุกครั้งที่ push firmware ใหม่ ต้องผ่าน checklist ต่อไปนี้ก่อน deploy
- Sensor reading ถูกต้อง (automated test บน dev board)
- MQTT connect + send ปกติ
- Deep sleep + wake up cycle ปกติ
- OTA rollback ทำงานได้ (ทดสอบด้วย intentionally broken firmware)
- Flash encryption ยังคงเปิดอยู่หลัง update

## 27.5 Version Control & Release

| Branch     | ใช้สำหรับ                                           |
| ---------- | --------------------------------------------------- |
| main       | Production firmware — deploy ไป device จริงเท่านั้น |
| develop    | Integration branch — รวม feature branches           |
| feature/\* | พัฒนา feature ใหม่                                  |
| hotfix/\*  | แก้ bug เร่งด่วนใน production                       |

- Semantic versioning: MAJOR.MINOR.PATCH (เช่น 1.2.3)
- MAJOR: เปลี่ยน protocol หรือ hardware incompatible
- MINOR: เพิ่ม feature ใหม่ backward compatible
- PATCH: bug fix
