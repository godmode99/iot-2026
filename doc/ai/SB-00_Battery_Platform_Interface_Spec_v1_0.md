# SB-00 — Battery Platform Interface Spec

**Version 1.0 | April 2026 | Working interface spec for EX-08A | Last synced: 2026-04-03**

> **Reference baseline:** ใช้คู่กับ [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Decision_Register_v1_1.md](./SB-00_Decision_Register_v1_1.md), และ [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md)

---

## 1. Purpose

เอกสารนี้ใช้ล็อก interface กลางสำหรับ `EX-08A` เพื่อให้ฝั่ง firmware/backend (`พล`) และ hardware/enclosure (`เอ`) ใช้กติกาชุดเดียวกันในการรองรับ battery 2 variants:

- `Standard`
- `Long-Life`

หลักการคือใช้ `core module เดียว` แล้วแยกเฉพาะ `battery module` และ `battery bay / enclosure section` โดยไม่แตกเป็นคนละ product line

## 2. Variant Definition

| Variant | เป้าหมาย | Runtime Target | หมายเหตุ |
| --- | --- | --- | --- |
| `Standard` | รุ่นหลัก | `>= 12 วัน @ 5 นาที` | baseline สำหรับ prototype/pilot |
| `Long-Life` | รุ่นอัปเกรด | `>= 30 วัน @ 5 นาที` หรือ `>= 60 วัน @ 10 นาที` | service-upgradeable option |

## 3. Shared Interface Rules

สิ่งต่อไปนี้ต้องเหมือนกันทั้ง `Standard` และ `Long-Life`

1. core board mounting points
2. battery connector family และ polarity orientation
3. antenna bulkhead positions
4. sensor cable exits / cable gland positions
5. QR label position และ provisioning flow
6. firmware codebase หลัก
7. backend schema หลัก
8. dashboard device model / runtime logic framework

## 4. Variant-Specific Parts

สิ่งที่เปลี่ยนได้ตาม variant

1. battery cell count / battery pack capacity
2. battery tray / service frame
3. enclosure depth หรือ battery bay extension
4. usable battery capacity ที่ใช้ใน runtime estimator
5. charging / service instructions เฉพาะรุ่น

## 5. Firmware Interface

firmware ต้องรองรับ field ต่อไปนี้

| Field | Type | Example | ใช้ทำอะไร |
| --- | --- | --- | --- |
| `battery_variant` | enum | `standard`, `long_life` | บอกรุ่นแบตของเครื่อง |
| `battery_profile_version` | string | `v1` | ใช้อ้างอิง profile ที่ active |
| `usable_capacity_mah` | uint32 | `5600`, `23200` | ใช้คำนวณ runtime |
| `service_only_upgrade` | bool | `true` | ระบุว่างานเปลี่ยนแบตเป็นงานช่าง |

ขั้นต่ำ firmware ต้องทำได้:

1. อ่าน `battery_variant`
2. map ไปยัง `battery_profile`
3. ใช้ `usable_capacity_mah` ใน runtime estimator
4. ใช้ battery thresholds ตาม profile

## 6. Backend / Dashboard Interface

backend/devices metadata ต้องเก็บอย่างน้อย:

1. `battery_variant`
2. `battery_profile_version`
3. `usable_capacity_mah`

dashboard ต้องแสดงอย่างน้อย:

1. battery variant
2. battery percentage
3. interval ปัจจุบัน
4. estimated runtime remaining

## 7. Hardware / Enclosure Interface

ฝั่ง hardware ต้องล็อกกติกาต่อไปนี้:

1. battery connector ต้องใช้แบบเดียวทั้ง 2 variants
2. connector ต้องกันเสียบกลับขั้ว
3. core board mount ต้องคงเดิม
4. `Long-Life` ต้องเปลี่ยนเฉพาะ battery zone / battery bay / rear housing section
5. sealing strategy หลักต้องไม่เปลี่ยนเพราะ variant
6. `Long-Life` เป็น `service-upgradeable` ไม่ใช่ `user-openable`

## 8. Deliverables For EX-08A

เมื่อจบ `EX-08A` ต้องได้เอกสาร/ผลลัพธ์ 3 ชิ้น:

1. interface spec 1 หน้า
2. battery profile table 1 หน้า
3. BOM delta ระหว่าง `Standard` และ `Long-Life` 1 หน้า

## 9. Sign-off

| ฝั่ง | รับผิดชอบ sign-off |
| --- | --- |
| `พล` | firmware fields, backend fields, runtime assumptions |
| `เอ` | connector, enclosure interface, service procedure |

---

## 10. Non-Negotiables

1. ห้ามแยก firmware เป็นคนละสายสำหรับ `Standard` กับ `Long-Life`
2. ห้ามทำ customer provisioning คนละ flow ตาม variant
3. ห้ามย้าย core board mount เพราะเปลี่ยน battery variant
4. ถ้ายังไม่มี service-safe enclosure design สำหรับ `Long-Life` ห้ามเปิดให้ลูกค้าเปลี่ยนเอง
