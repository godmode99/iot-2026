# SB-00 — Execution Task List

**Version 1.1 | April 2026 | Ready-to-execute task list derived from locked baseline | Last synced: 2026-04-02**

> **Reference baseline:** ใช้คู่กับ [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) และ [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md)
>
> **Scope:** เอกสารนี้แปลง baseline ปัจจุบันให้เป็น task list ที่พร้อมลงมือทำจนถึง `pilot start`

---

## 0. Working Goal

เป้าหมายของ execution list นี้คือทำให้ทีมสามารถ:

- build prototype ที่วัด `temperature + turbidity + GPS + battery` ได้จริง
- ส่งข้อมูลผ่าน `MQTT over 4G/TLS` ไปถึง backend และ dashboard
- ผ่าน `Engineering Field Test 7 วัน`
- สร้าง `custom PCB + enclosure pilot baseline`
- เปิด `Pilot / Beta Validation 30 วัน` ได้โดยใช้ assumption ชุดเดียวกันทั้ง firmware, backend, hardware, และ procurement

## 1. Locked Baseline For Execution

| Area | Locked baseline |
| --- | --- |
| Enclosure | `150×100×60 mm` สำหรับ PCB v1 และ pilot batch |
| GPS | ใช้ `L76K` เป็น default; เปลี่ยนเป็น `NEO-M8N` เฉพาะเมื่อชน trigger ที่ล็อกไว้ |
| Provisioning | `QR Code + Web/PWA` เป็น customer flow เดียวสำหรับ MVP และ pilot |
| Battery Platform | `Standard` เป็น baseline; `Long-Life` เป็น optional upgrade โดยใช้ core module เดียวกัน |
| Production 4G | `A7670E` default; `SIM7670E` conditional fallback |
| Phase 1 provisioning | `QR Code + Web/PWA` |
| Battery pass target | `>= 12 วัน @ 5 นาที` |
| Pilot messaging | ใช้ `LINE free tier` ระหว่าง pilot |

## 2. Critical Path

1. Procurement + dev environment พร้อมใช้งาน
2. Firmware/device bring-up + backend ingest + dashboard MVP ต่อกันครบ
3. Bench test + battery/runtime + connectivity stability ผ่าน
4. Engineering Field Test 7 วัน ผ่าน พร้อมสรุป GPS/runtime findings
5. PCB v1 + enclosure v1 + secure provisioning/OTA flow พร้อม
6. ประกอบ pilot units + QC + onboarding docs พร้อม
7. เริ่ม Pilot / Beta Validation 30 วัน

## 3. Immediate Queue — P0

| ID | Owner | Task | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| EX-01 | พล | ตั้งค่า firmware/backend/dashboard workspace ให้รันได้ในเครื่อง dev เดียวกัน พร้อม `.env` inventory และ secret checklist | baseline docs locked | repo runbook 1 หน้า, env names ตรงกับ backend doc, dev stack boot ได้ |
| EX-02 | พล + เอ | สั่งซื้อของ Phase 1 ที่ยังไม่มีจริงตาม procurement baseline | baseline BOM locked | ออก purchase list, สั่งของแล้ว, มี ETA ต่อรายการ |
| EX-03 | พล | ทำ firmware skeleton บน ESP32-S3: config load, NVS, task scheduler, watchdog, structured logging | EX-01 | build ผ่าน, boot ได้, มี log boot summary, save/read config ได้ |
| EX-04 | พล | ทำ sensor drivers Phase 1: `DS18B20 + analog turbidity + MAX17048 + L76K` บน dev board | EX-03 | อ่านค่าได้ต่อเนื่อง, มี unit log/sample payload, sensor fault ถูก handle |
| EX-05 | พล | ทำ 4G + MQTT over TLS บน FS-HCore และส่ง telemetry payload จริงขึ้น broker | EX-03 | publish QoS1 สำเร็จ, reconnect ได้, offline buffer/retry เริ่มทำงาน |
| EX-06 | พล | สร้าง Supabase schema/migrations + RLS ตาม backend doc สำหรับ farms/devices/telemetry/alerts/command_log | EX-01 | migration รันได้, table หลักครบ, RLS policy หลักใช้ได้ |
| EX-07 | พล | ทำ ingest path จาก MQTT -> backend -> DB และเก็บ latest device status | EX-05, EX-06 | telemetry จาก device เข้า DB จริง, latest status/dashboard query ได้ |
| EX-08 | เอ | ล็อก enclosure CAD v1 ตาม baseline `150×100×60 mm` พร้อมตำแหน่ง antenna, cable gland, battery, และ mounting holes | D-01 closed | มี CAD/STL draft v1, component placement fit check ผ่าน |
| EX-08A | พล + เอ | นิยาม battery platform สำหรับ `Standard` และ `Long-Life`: connector, battery profile, service procedure, และ enclosure interface | EX-01 | มี interface spec 1 ชุด ใช้ร่วมกันได้ทั้งสอง variant |

### EX-08A Working Checklist

1. พลกำหนด `battery_profile` ใน firmware อย่างน้อย `standard` และ `long_life`
2. พลกำหนด field ใน backend/devices metadata สำหรับเก็บ battery variant และ usable capacity
3. พลสรุป charging/runtime assumptions ของแต่ละ variant เป็นตารางเดียว
4. เอกำหนด battery connector มาตรฐานเดียวที่ใช้ได้ทั้งสอง variant และกันเสียบกลับขั้ว
5. เอกำหนดตำแหน่งยึด core board, antenna bulkhead, และ sensor exits ให้คงเดิมทั้งสอง variant
6. เอกำหนดส่วนของ enclosure ที่เปลี่ยนได้เฉพาะ battery bay หรือฝาหลัง โดยไม่แตะ sealing strategy หลัก
7. ทั้งคู่สรุป service procedure ว่า `Long-Life` เป็น service-upgradeable ไม่ใช่ customer-openable
8. ทั้งคู่สรุป BOM delta ระหว่าง `Standard` กับ `Long-Life` เป็นหน้าเดียวใช้ประกอบการตัดสินใจ pilot
9. Output ที่ต้องได้: interface spec 1 หน้า + battery profile table 1 หน้า + BOM delta 1 หน้า
10. Sign-off: พล approve firmware/backend fields, เอ approve connector/enclosure interface

## 4. Phase 1 Completion — Prototype To Stage A Field Test

| ID | Owner | Task | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| EX-09 | พล | ทำ dashboard MVP: device list, latest card, map, historical chart, online/offline status | EX-07 | เปิดดู device 1-3 ตัวได้ครบ, map + latest values ถูกต้อง |
| EX-10 | พล | ทำ alert MVP: threshold, offline, battery low และ notification stub สำหรับ LINE/email/web | EX-07 | alert trigger/resolution ครบ 3 แบบ, duplicate suppression ทำงาน |
| EX-11 | พล | ทำ QR + Web/PWA provisioning flow สำหรับ Phase 1 MVP | EX-06, EX-07 | scan QR -> register device -> device ผูก farm สำเร็จ |
| EX-12 | พล + เอ | ทำ bench soak test 48 ชั่วโมง: sensor read, MQTT reconnect, buffer flush, power cycle recovery | EX-04, EX-05, EX-07 | ไม่มี data corruption, reconnect ได้, crash/reboot อยู่ในเกณฑ์ |
| EX-13 | พล + เอ | วัด current draw จริงและคำนวณ runtime เทียบ baseline `>= 12 วัน @ 5 นาที` | EX-12 | มี measurement sheet, runtime estimate อิงค่าจริง, gap list ชัด |
| EX-14 | เอ | ประกอบ enclosure prototype + waterproof assembly flow รอบแรก | EX-08 | prototype ประกอบได้จริง, antenna/cable gland layout ใช้งานได้ |
| EX-15 | พล + เอ | รัน `Engineering Field Test 7 วัน` และสรุปผล runtime, connectivity, GPS trigger, sensor stability | EX-09, EX-10, EX-11, EX-13, EX-14 | field test report 1 ชุด, pass/fail ต่อ baseline ชัด, GPS trigger review ปิดได้ |

## 5. Phase 2 — Pilot Preparation

| ID | Owner | Task | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| EX-16 | เอ | ทำ schematic PCB v1 ตาม locked BOM: `ESP32-S3 + A7670E + L76K + MAX17048 + SEN0600 path + power switching` | EX-15 | schematic review ผ่าน, footprints/critical nets ถูกต้อง |
| EX-17 | เอ | ทำ PCB layout v1 ให้ fit ใน enclosure baseline `150×100×60 mm` และเตรียม Gerber/BOM/CPL | EX-16, EX-08 | DRC ผ่าน, manufacturing package ครบ, fit check ผ่าน |
| EX-17A | เอ | ออกแบบ enclosure interface ให้รองรับ battery module 2 ขนาด โดยไม่เปลี่ยน core board mount และ sealing strategy หลัก | EX-08, EX-08A | มี CAD concept สำหรับ `Standard` และ `Long-Life` พร้อม service access plan |
| EX-18 | พล + เอ | ทำ bench validation สำหรับ `SIM7670E` fallback path โดยทดสอบ power-up, MQTT TLS, OTA flow เทียบ `A7670E` baseline | EX-16 | สรุป compatibility note ชัดว่า fallback ใช้ได้หรือไม่ |
| EX-19 | พล | ทำ secure provisioning/OTA production flow: signed firmware, release metadata, push auth, recovery path | EX-07, EX-11 | OTA test ผ่านบน dev hardware, rollback path documented |
| EX-20 | พล | ประเมิน `BLE provisioning` เป็น internal R&D เท่านั้นหลัง pilot โดยไม่กระทบ customer flow หลัก | EX-11 | มี technical note ภายในว่าคุ้มทำต่อหรือไม่ โดยไม่มีผลกับคู่มือและ flow ลูกค้า |
| EX-21 | เอ | สร้าง assembly + QC package สำหรับ pilot batch: visual, electrical, waterproof, provisioning checklist | EX-17, EX-19 | QC checklist ใช้งานหน้างานได้, serial/QR workflow ชัด |
| EX-22 | พล | hardening backend สำหรับ pilot: monitoring, error logging, backups, retry jobs, export/report path | EX-09, EX-10, EX-19 | pilot ops checklist ผ่าน, logs/backup/retry ใช้งานได้ |
| EX-23 | พล + เอ | ประกอบ pilot units ชุดแรกและทดสอบ onboarding end-to-end กับ flow จริง | EX-21, EX-22 | device 3-5 เครื่อง onboard ได้ครบ, QC ผ่าน, dashboard/alert ใช้ได้ |

## 6. Pilot Start Readiness

| ID | Owner | Task | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| EX-24 | พล | สรุปคู่มือผู้ใช้ pilot: install guide, QR onboarding, troubleshooting, support path | EX-23 | PDF/Word พร้อมส่งลูกค้า pilot |
| EX-25 | พล + เอ | จัด `Pilot Readiness Review` รอบสุดท้ายก่อนเริ่ม 30 วัน | EX-23, EX-24 | sign-off ต่อ battery, GPS, enclosure, provisioning, backend ops |
| EX-26 | พล + เอ | เริ่ม `Pilot / Beta Validation 30 วัน` พร้อมเก็บ issue log และ weekly review cadence | EX-25 | pilot start date ถูกล็อก, issue log template พร้อม, owner ต่อปัญหาชัด |

## 7. Not Critical For Pilot Start

| ID | Owner | Task | Why not critical now | Review point |
| --- | --- | --- | --- | --- |
| EX-27 | พล | LINE paid plan / cost optimization | ใช้ free tier ระหว่าง pilot ได้ | review ก่อน commercial launch |
| EX-28 | พล | Stripe/Omise production billing polish | pilot ยังใช้ non-commercial / limited evaluation ได้ | review ช่วง launch readiness |
| EX-29 | เอ | enclosure size optimization หลัง pilot | current baseline ใช้ได้สำหรับ PCB v1/pilot แล้ว | review หลังมี buoyancy/thermal/assembly data |

## 8. Suggested Working Rhythm

| Cadence | Focus |
| --- | --- |
| Daily | update EX status, blocker, และ next action 1 อย่างต่อ owner |
| ทุก 3 วัน | sync firmware/backend/hardware assumptions ว่ายังไม่ drift จาก master |
| Weekly | review bench/field data เทียบ baseline pass criteria |
| ก่อนจบแต่ละ stage | สรุป evidence ว่า task ไหนผ่าน DoD แล้วจริง |

## 9. First 10 Tasks To Start Immediately

1. EX-01 ตั้งค่า workspace + env inventory
2. EX-02 สั่งของ Phase 1 ที่ยังขาด
3. EX-03 firmware skeleton
4. EX-06 schema + migrations
5. EX-04 sensor drivers
6. EX-05 4G + MQTT TLS
7. EX-07 ingest path
8. EX-08A battery platform interface spec
9. EX-08 enclosure CAD v1
10. EX-09 dashboard MVP
