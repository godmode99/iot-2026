# SB-00 — Master Assumptions

**Version 1.1 | April 2026 | Canonical baseline for all SB-00 v1.1 documents**

---

เอกสารนี้เป็น baseline กลางสำหรับเอกสารชุด SB-00 v1.1 ทุกไฟล์

- ใช้ล็อกคำศัพท์ phase/launch ให้ตรงกัน
- ใช้ล็อกตัวเลขงบ baseline ให้ตรงกัน
- ใช้ล็อก battery target, field-test stages, certification stance, และ OTA auth baseline
- ถ้าเอกสารใดขัดกับไฟล์นี้ ให้ยึดไฟล์นี้ก่อนจนกว่าจะมีการอัปเดตเป็น version ใหม่

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

## 7. การอ้างอิงในเอกสาร

ทุกเอกสารหลักควรอ้างถึงไฟล์นี้อย่างน้อยหนึ่งจุดใกล้ส่วนบนของเอกสาร เพื่อให้คนอ่านรู้ว่า:

- ใช้ phase definitions ชุดเดียวกัน
- ใช้ budget baseline ชุดเดียวกัน
- ใช้ battery target ชุดเดียวกัน
- ใช้ certification stance ชุดเดียวกัน
