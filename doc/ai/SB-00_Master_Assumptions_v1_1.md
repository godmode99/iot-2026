# SB-00 — Master Assumptions

**Version 1.1 | April 2026 | Canonical baseline for all SB-00 v1.1 documents | Last synced: 2026-04-02**

---

เอกสารนี้เป็น baseline กลางสำหรับเอกสารชุด SB-00 v1.1 ทุกไฟล์

- ใช้ล็อกคำศัพท์ phase/launch ให้ตรงกัน
- ใช้ล็อกตัวเลขงบ baseline ให้ตรงกัน
- ใช้ล็อก battery target, field-test stages, certification stance, และ OTA auth baseline
- ถ้าเอกสารใดขัดกับไฟล์นี้ ให้ยึดไฟล์นี้ก่อนจนกว่าจะมีการอัปเดตเป็น version ใหม่

## 0. Document Sync Status

| Document | Version | Last synced | Status |
| --- | --- | --- | --- |
| `SB-00_Dev_Plan_Summary_v1_1.md` | 1.1 | 2026-04-02 | aligned to master assumptions |
| `SB-00_Business_Roadmap_v1_1.md` | 1.1 | 2026-04-02 | aligned to master assumptions |
| `SB-00_Decision_Register_v1_1.md` | 1.1 | 2026-04-02 | closed decisions synced to baseline |
| `SB-00_Backend_Security_v1_1.md` | 1.1 | 2026-04-02 | aligned to master assumptions |
| `SB-00_Firmware_Hardware_v1_1.md` | 1.1 | 2026-04-02 | aligned to master assumptions |
| `SB-00_Procurement_List_v1_1.md` | 1.1 | 2026-04-02 | aligned to master assumptions |
| `SB-00_Third_Party_Pricing_Baseline_v1_1.md` | 1.1 | 2026-04-02 | canonical pricing/limits table |
| `SB-00_Execution_Task_List_v1_1.md` | 1.1 | 2026-04-02 | derived from locked baseline + closed decisions |

## 1. คำศัพท์มาตรฐาน

| คำ | ความหมาย |
| --- | --- |
| Engineering Field Test (7 วัน) | การทดสอบปลาย Phase 1 ในบ่อจริง 7 วัน เพื่อ validate firmware, enclosure, connectivity และการใช้งานจริงเบื้องต้น เป็นงานภายใน/ไม่ใช่ commercial sale |
| Pilot / Beta Validation (30 วัน) | การทดสอบ 3-5 เครื่องกับฟาร์มคัดเลือกก่อนเปิดขายจริง ใช้เก็บ feedback, reliability data, และ launch checklist เป็นงาน non-commercial หรือ pilot agreement เท่านั้น |
| Commercial Launch | การเปิดขายแบบมีลูกค้าจ่ายเงินจริงต่อสาธารณะในไทย ต้องทำหลังผ่าน regulatory minimum readiness สำหรับการจำหน่าย |
| Public Launch | ใช้ความหมายเดียวกับ Commercial Launch ไม่แยกอีกคำในเอกสาร v1.1 |

> **หลักการใช้งาน:** ในเอกสาร planning ช่วง Sep-Oct 2026 ให้ใช้คำว่า `Pilot & Launch Readiness` แทน `Commercial Launch` จนกว่าจะผ่านเงื่อนไขการจำหน่าย

## 2. งบ Baseline

| Phase | Baseline Budget |
| --- | --- |
| Phase 1 — Prototype & Full Test | ~20,400 THB |
| Phase 2 — PCB Development | ~4,000 THB |
| Phase 3 — Pilot & Launch Readiness | ~4,300 THB |
| รวม Phase 1-3 | ~28,700 THB |

> **หมายเหตุ:** งบ baseline นี้ยังไม่รวม กสทช., IP67 lab test, และ marketing

## 3. Battery Baseline

- Default telemetry interval สำหรับ baseline คือ `5 นาที`
- เกณฑ์ผ่านขั้นต่ำของเอกสาร planning/DoD คือ `battery runtime >= 12 วัน`
- เป้าหมายหลัง optimize PSM + battery-aware interval control คือ `14-16 วัน`
- ตัวเลขคำนวณ conservative ที่ต่ำกว่านี้ถือเป็น diagnostic reference ไม่ใช่ acceptance criteria หลัก

## 4. Field Validation Stages

| Stage | ระยะเวลา | ใช้เมื่อ |
| --- | --- | --- |
| Stage A — Engineering Field Test | 7 วัน | ปลาย Phase 1 |
| Stage B — Pilot / Beta Validation | 30 วัน | ก่อน Commercial Launch |

## 5. Certification & Sales Stance

- Pilot / beta สามารถทำก่อน กสทช. ได้ ถ้าเป็น non-commercial evaluation
- Commercial / public paid sales ในไทย เริ่มหลังผ่าน approval ที่จำเป็นสำหรับการจำหน่าย
- เอกสาร Phase 2 ต้องสะท้อนว่าเริ่มเตรียมและยื่น กสทช. ตั้งแต่ช่วงปลาย Phase 2 หรือต้น Phase 3 ไม่ใช่เลื่อนไปหลังการขายจริง

## 6. OTA Auth Baseline

| Route | Auth Baseline |
| --- | --- |
| `/api/ota/releases` `POST` | `SVC` |
| `/api/ota/push` `POST` | `JWT (owner/admin)` |
| `/api/ota/push/batch` `POST` | `SVC` |

## 7. Provisioning Baseline

- Phase 1 / MVP ใช้ `QR Code + Web/PWA provisioning page` เป็น flow หลัก
- Phase 2+ และรอบ pilot ของเอกสาร v1.1 ยังคงใช้ `QR Code + Web/PWA provisioning page` เป็น customer-facing flow เดียว
- `BLE provisioning` ไม่ถือเป็น baseline ของ customer flow ในเอกสาร v1.1; ถ้าทดลองภายในให้ถือเป็น internal R&D เท่านั้นจนกว่าจะมี decision ใหม่
- `iPhone/iPad`, Android, และ browser/device อื่นทั้งหมดต้องใช้ flow เดียวกัน คือ `QR Code + Web/PWA` เพื่อลดความสับสนของลูกค้าและ support
- `Native mobile app` ไม่ถือเป็น baseline ของเอกสาร v1.1
- `factory USB flash / QC tool` ใช้เฉพาะงานโรงงาน, QC, recovery, หรือ support ภายในทีม ไม่ใช่ flow หลักของลูกค้า

## 8. BOM Baseline

| Area | Prototype / Phase 1 | Production / Phase 2+ | Note |
| --- | --- | --- | --- |
| MCU + 4G | FS-HCore-A7670C dev board | ESP32-S3 + `A7670E` บน custom PCB | `SIM7670E` เป็น sourcing fallback เฉพาะเมื่อ `A7670E` unavailable, lead time > 14 วัน, หรือ price delta > 20% และ bench validation ผ่าน |
| GPS | `L76K` | `L76K` | `NEO-M8N` ใช้เมื่อ Stage A/B field test ชี้ว่า L76K ไม่ผ่าน trigger ที่ล็อกไว้ |
| Turbidity | Analog sensor | `SEN0600 RS485` | Analog ใช้ dev/test เท่านั้น ไม่ใช่ production BOM |

## 9. Third-Party Pricing Baseline

- single source of truth สำหรับ pricing/limits/upgrade trigger อยู่ที่ [SB-00_Third_Party_Pricing_Baseline_v1_1.md](./SB-00_Third_Party_Pricing_Baseline_v1_1.md)
- ตัวเลขราคาหรือ quota ของ third-party services ในเอกสาร v1.1 เป็น `internal planning assumptions` ที่ sync กันในรอบเอกสารนี้ ไม่ใช่ live verified quote
- ถ้าต้องระบุราคาที่ vendor เปลี่ยนได้ง่าย เช่น `LINE OA`, `Vercel Pro`, `Upstash`, `HiveMQ`, `Supabase`, `Resend`, `Stripe`, `Omise` ให้ถือเป็น estimate จนกว่าจะ re-check ก่อน commercial launch
- การคำนวณ trigger ของ free tier ให้ยึด `5-minute telemetry baseline` และ `จำนวน active devices จริง` ใน phase นั้น

## 10. Decision Status

> **Decision workflow:** final choice แบบละเอียดและเหตุผลเต็มอยู่ใน [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md) เอกสารนี้เก็บเฉพาะ baseline ที่ล็อกแล้วสำหรับให้ทุกไฟล์อ้างอิงตรงกัน

| ID | Status | Locked baseline | Owner | Closed on / Review point |
| --- | --- | --- | --- | --- |
| D-01 | Closed | ล็อก enclosure ภายนอก `150×100×60 mm` สำหรับ `PCB v1` และ `pilot batch`; ค่อย optimize หลัง pilot ถ้า field data บังคับ | เอ | 2026-04-02 |
| D-02 | Closed | ใช้ `L76K` ต่อ และสลับเป็น `NEO-M8N` เฉพาะเมื่อ median TTFF หลัง wake > 60 วินาที, stationary open-sky error > 15 m มากกว่า 10% ของ sample, หรือ geofence false alert > 2 ครั้ง/เครื่อง/สัปดาห์ | พล + เอ | 2026-04-02 |
| D-03 | Closed | ใช้ `QR + Web/PWA` เป็น provisioning baseline เดียวสำหรับ MVP และ pilot; `BLE provisioning` ไม่ใช่ customer baseline ในเอกสาร v1.1 | พล | 2026-04-02 |
| D-04 | Closed | `A7670E` เป็น production default; ใช้ `SIM7670E` ได้เมื่อ `A7670E` unavailable, lead time > 14 วัน, หรือ price delta > 20% และ bench validation ผ่านก่อน freeze BOM | เอ | 2026-04-02 |
| D-05 | Closed | ใช้ `LINE free tier` ตลอด pilot และค่อย review paid plan เมื่อ forecast > 200 msg/mo หรือก่อน commercial launch readiness review | พล | 2026-04-02 / review ก่อน commercial launch |

## 11. การอ้างอิงในเอกสาร

ทุกเอกสารหลักควรอ้างถึงไฟล์นี้อย่างน้อยหนึ่งจุดใกล้ส่วนบนของเอกสาร เพื่อให้คนอ่านรู้ว่า:

- ใช้ phase definitions ชุดเดียวกัน
- ใช้ budget baseline ชุดเดียวกัน
- ใช้ battery target ชุดเดียวกัน
- ใช้ certification stance ชุดเดียวกัน
- ใช้ provisioning flow ชุดเดียวกัน
- ใช้ prototype/production BOM baseline ชุดเดียวกัน
- ใช้ pricing assumptions ของ third-party services ชุดเดียวกัน
