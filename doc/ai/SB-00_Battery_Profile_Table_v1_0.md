# SB-00 — Battery Profile Table

**Version 1.0 | April 2026 | Working profile table for EX-08A | Last synced: 2026-04-03**

> **Reference baseline:** ใช้คู่กับ [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md), [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), และ [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md)

---

## 1. Purpose

เอกสารนี้ใช้ล็อก `battery_profile` กลางสำหรับ firmware, backend, dashboard, และเอกสาร support เพื่อให้ `Standard` และ `Long-Life` ใช้ค่าชุดเดียวกัน

## 2. Canonical Battery Profiles

| Field | `standard` | `long_life` | หมายเหตุ |
| --- | --- | --- | --- |
| `battery_variant` | `standard` | `long_life` | enum หลักของระบบ |
| `battery_profile_version` | `v1` | `v1` | เริ่มต้นใช้ version เดียวกัน |
| `usable_capacity_mah` | `5600` | `23200` | ใช้คำนวณ runtime estimate |
| `default_interval_sec` | `300` | `300` | เริ่มต้น 5 นาทีทั้งคู่ |
| `night_interval_sec` | `900` | `1800` | Long-Life เปิดทางประหยัดไฟกลางคืนได้มากกว่า |
| `low_battery_warn_pct` | `15` | `20` | Long-Life เตือนเร็วกว่านิดหน่อยเพราะ pack ใหญ่และงาน service แพงกว่า |
| `low_battery_critical_pct` | `10` | `10` | จุดวิกฤตร่วมกัน |
| `service_only_upgrade` | `true` | `true` | งานเปลี่ยน module เป็นงานช่าง |

## 3. Derived Runtime Targets

| Variant | Interval | Runtime target | Use case |
| --- | --- | --- | --- |
| `standard` | 5 นาที | `>= 12 วัน` | baseline prototype / pilot |
| `standard` | 10 นาที | `stretch only` | ใช้ลดการส่งเมื่ออยากยืดอายุแบต |
| `long_life` | 5 นาที | `>= 30 วัน` | ลูกค้าที่ต้องการ near-real-time นานขึ้น |
| `long_life` | 10 นาที | `>= 60 วัน` | ลูกค้าที่เน้น runtime มากกว่าความถี่ |

## 4. Firmware Rules

1. firmware ต้อง map `battery_variant` ไปยัง profile table นี้โดยตรง
2. ห้าม hardcode threshold แยกนอก profile
3. runtime estimator ต้องคำนวณจาก `usable_capacity_mah`
4. ถ้า profile version เปลี่ยน ให้บันทึก `battery_profile_version` ใน device metadata ทุกครั้ง

## 5. Backend / Dashboard Rules

1. devices metadata ต้องเก็บ `battery_variant`
2. devices metadata ต้องเก็บ `battery_profile_version`
3. devices metadata ต้องเก็บ `usable_capacity_mah`
4. dashboard ต้องแสดงชื่อ variant และ runtime estimate ตาม profile จริงของเครื่อง

## 6. Review Notes

ค่าชุด `v1` นี้เป็น working baseline สำหรับเริ่ม implement และทดสอบจริง ถ้าผล current draw, field test, หรือ battery degradation ต่างจากที่คาด ให้ update version profile แล้ว sync เอกสารชุดนี้ก่อน
