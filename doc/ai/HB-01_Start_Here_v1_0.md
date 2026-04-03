# SB-00 — Start Here

**Version 1.0 | April 2026 | Human-friendly entry point | Last synced: 2026-04-03**

---

## What This Project Is

SB-00 คือระบบ IoT สำหรับติดตั้งในบ่อ/ฟาร์ม เพื่อตรวจวัด `temperature + turbidity + GPS + battery` แล้วส่งข้อมูลผ่าน `4G / MQTT` ไปที่ backend และ dashboard

## What Is Already Locked

| เรื่อง | Baseline ที่ใช้ |
| --- | --- |
| Provisioning | ใช้ `QR + Web/PWA` flow เดียว |
| GPS | ใช้ `L76K` เป็น default |
| 4G production | ใช้ `A7670E` เป็น default |
| Battery platform | ใช้ `core module เดียว + 2 battery variants` |
| Variants | `Standard` และ `Long-Life` |
| Standard target | `>= 12 วัน @ 5 นาที` |
| Long-Life direction | `>= 30 วัน @ 5 นาที` หรือ `>= 60 วัน @ 10 นาที` |

## Team Split

| คน | โฟกัส |
| --- | --- |
| `พล` | firmware, backend, dashboard, MQTT, OTA, battery profile |
| `เอ` | enclosure, hardware, battery module, waterproofing, assembly |

## What We Are Doing Next

ตอนนี้ทีมไม่ได้อยู่ในช่วงเก็บเอกสารแล้ว แต่กำลังจะเริ่มงาน `EX-01`, `EX-08A`, `EX-08`, และ `EX-17A`

สิ่งที่ต้องทำก่อนคือ:

1. ตั้ง workspace ให้พร้อม
2. ล็อก battery platform interface
3. ออกแบบ enclosure และ battery bay สำหรับ `Standard` กับ `Long-Life`

## The 5 Documents You Actually Need

1. ไฟล์นี้ — ใช้เริ่มต้น
2. `Action Plan` — ดูว่าใครทำอะไรต่อ
3. `System Design` — ดูภาพระบบรวมและ battery platform
4. `Cost and Procurement` — ดูต้นทุนและของที่ต้องซื้อ
5. `Business and Launch` — ดู SKU, pilot, และแผนขาย

## Non-Negotiables

1. ฝั่งลูกค้าใช้ provisioning flow เดียว
2. ห้ามแยก firmware เป็นคนละสายตาม battery variant
3. `Long-Life` เป็น service-upgradeable ไม่ใช่ให้ลูกค้าเปิดเอง
4. `Standard` ยังเป็นรุ่นหลักของ pilot
