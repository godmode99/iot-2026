# SB-00 — Business And Launch

**Version 1.0 | April 2026 | Human-friendly business and launch view | Last synced: 2026-04-03**

---

## Product Strategy

| SKU | บทบาท |
| --- | --- |
| `Standard` | รุ่นหลักสำหรับ pilot และตลาดเริ่มต้น |
| `Long-Life` | รุ่นอัปเกรดสำหรับลูกค้าที่ต้องการ runtime สูง |

## Pricing Direction

| SKU | ราคาเป้าหมาย |
| --- | --- |
| `Standard` | `4,500-6,000 THB` |
| `Long-Life` | `6,500-9,000+ THB` แบบ working range |

## Why Two SKUs Make Sense

1. ไม่ดันต้นทุนทุกเครื่องให้สูงโดยไม่จำเป็น
2. เปิดทาง upsell
3. ตรงกับ use case ลูกค้าที่ต่างกัน
4. คุม platform หลักให้ไม่แตก

## Pilot Rule

สำหรับรอบ pilot:

1. `Standard` ยังเป็น baseline หลัก
2. `Long-Life` เป็น option ที่ต้องผ่านงาน design/service ก่อน
3. ห้ามประกาศ capability ของ Long-Life เป็น commitment ตลาดจนกว่า battery pack และ enclosure จะนิ่ง

## Launch Readiness Checklist

1. provisioning flow เดียวใช้งานได้จริง
2. Standard ผ่าน runtime baseline
3. enclosure กันน้ำผ่าน
4. backend/dashboard ใช้ได้จริง
5. ถ้าจะเปิด Long-Life ต้องมี BOM, service flow, และต้นทุนปิดชัดแล้ว

## Decision For Team

ช่วงนี้ทีมยังไม่ต้องโฟกัสเอกสารธุรกิจยาว ๆ มาก

สิ่งที่สำคัญกว่าคือ:

1. ทำ Standard ให้เดินได้จริง
2. ออกแบบ Long-Life ให้เป็น optional upgrade ที่ไม่ทำให้ระบบหลักพัง
