# SB-00 — Action Plan

**Version 1.0 | April 2026 | Human-friendly execution view | Last synced: 2026-04-03**

---

## Current Focus

เป้าหมายของรอบนี้คือทำให้ทีมเริ่มงานจริงได้ โดยไม่ต้องย้อนเปิดเอกสารหลายไฟล์พร้อมกัน

## Immediate Priority

| Priority | Task | Owner | Definition of done |
| --- | --- | --- | --- |
| P0 | `EX-01` workspace + env inventory | `พล` | dev stack boot ได้ |
| P0 | `EX-08A` battery platform interface | `พล + เอ` | interface spec + battery profile + BOM delta ครบ |
| P0 | `EX-08` enclosure CAD v1 | `เอ` | CAD draft สำหรับ Standard ผ่าน fit check |
| P1 | `EX-03` firmware skeleton | `พล` | boot ได้, save/read config ได้ |
| P1 | `EX-06` schema + migrations | `พล` | table หลักและ RLS ใช้ได้ |
| P1 | `EX-17A` enclosure interface สำหรับ 2 variants | `เอ` | มี concept สำหรับ Standard / Long-Life |

## EX-08A Deliverables

1. Battery platform interface spec
2. Battery profile table
3. BOM delta ระหว่าง `Standard` กับ `Long-Life`

## Work Split

### พล

1. ทำ `battery_profile`
2. กำหนด fields ใน firmware/backend
3. สรุป runtime assumptions
4. เตรียม schema รองรับ `battery_variant`

### เอ

1. ล็อก connector มาตรฐาน
2. ล็อกตำแหน่งยึด core board
3. ออกแบบ `battery bay` สำหรับ `Standard` และ `Long-Life`
4. สรุป service procedure สำหรับรุ่น Long-Life

## Working Rhythm

| Cadence | ทำอะไร |
| --- | --- |
| Daily | อัปเดต status + blocker + next step |
| ทุก 3 วัน | sync firmware/backend/hardware assumptions |
| Weekly | review runtime, cost, และ fit ของ enclosure |

## What Not To Do Right Now

1. อย่าแตก provisioning เป็นหลาย flow
2. อย่ากระโดดไปทำ native app
3. อย่าไป optimize launch/business จนกว่าของ prototype จะเริ่มขยับจริง
