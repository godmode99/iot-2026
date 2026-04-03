# SB-00 — System Design

**Version 1.0 | April 2026 | Human-friendly system overview | Last synced: 2026-04-03**

---

## System Flow

`Device -> 4G / MQTT -> Backend -> Database -> Dashboard`

## Device Summary

| ส่วน | ใช้อะไร |
| --- | --- |
| MCU | ESP32-S3 |
| 4G | FS-HCore ใน prototype / `A7670E` ใน production |
| GPS | `L76K` |
| Sensors | DS18B20, turbidity, MAX17048 |
| Provisioning | `QR + Web/PWA` |

## Battery Platform

| Variant | จุดประสงค์ | Runtime target |
| --- | --- | --- |
| `Standard` | รุ่นหลักของ pilot | `>= 12 วัน @ 5 นาที` |
| `Long-Life` | รุ่นอัปเกรด | `>= 30 วัน @ 5 นาที` หรือ `>= 60 วัน @ 10 นาที` |

## Shared Rules Across Both Variants

1. ใช้ core board เดียว
2. ใช้ provisioning flow เดียว
3. ใช้ firmware codebase เดียว
4. ใช้ backend schema เดียว
5. ใช้ตำแหน่ง antenna และ sensor exits เดียวกัน

## Things That Can Change By Variant

1. battery cell count
2. usable battery capacity
3. battery tray / pack hardware
4. enclosure depth หรือ battery bay

## Firmware / Backend Fields

| Field | ใช้ทำอะไร |
| --- | --- |
| `battery_variant` | บอกรุ่นแบต |
| `battery_profile_version` | บอกเวอร์ชัน profile |
| `usable_capacity_mah` | ใช้คำนวณ runtime |
| `service_only_upgrade` | บอกว่าเป็นงานช่าง |

## Enclosure Rules

1. `Standard` ใช้ baseline `150 × 100 × 60 mm`
2. `Long-Life` ใช้ footprint core เดิม แต่ขยาย battery bay ได้
3. ห้ามย้าย core board mount เพราะเปลี่ยน variant
4. ห้ามทำให้ลูกค้าเปิดกล่องเองเพื่อเปลี่ยน battery module

## Non-Negotiables

1. `QR + Web/PWA` คือ customer flow เดียว
2. `Long-Life` เป็น optional upgrade ไม่ใช่ baseline ทุกเครื่อง
3. ถ้ายังไม่มี service-safe enclosure ห้ามเปิดขาย Long-Life
