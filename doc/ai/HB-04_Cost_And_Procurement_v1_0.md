# SB-00 — Cost And Procurement

**Version 1.0 | April 2026 | Human-friendly cost and buying view | Last synced: 2026-04-03**

---

## Cost View

| รุ่น | ต้นทุนแบตโดยประมาณ | หมายเหตุ |
| --- | --- | --- |
| `Standard` | ~250-300 THB | 18650 x2 baseline |
| `Long-Life` | ~1,200-1,500 THB เฉพาะ cell | ยังไม่รวม pack hardware และ enclosure เพิ่ม |

## BOM Delta

| Area | Standard | Long-Life |
| --- | --- | --- |
| Battery cells | 2 ก้อน | 8-10 ก้อน |
| Battery hardware | holder เล็ก | battery module / service tray |
| Enclosure | baseline | battery bay ลึกขึ้น |
| Assembly | baseline | ซับซ้อนขึ้น |

## What Must Be Bought For Standard First

1. 18650 x2
2. battery holder / baseline pack hardware
3. TP4056
4. enclosure baseline parts

## What Is Conditional For Long-Life

1. cell เพิ่ม 6-8 ก้อน
2. fuse / protection เพิ่ม
3. connector with lock
4. service tray หรือ welded pack
5. battery bay / enclosure extension

## Buying Rule

เริ่มสั่งของ `Standard` ก่อน แล้วค่อยสั่งของ `Long-Life` เมื่อ:

1. battery interface ปิดแล้ว
2. enclosure concept ผ่าน
3. ทีมตัดสินใจว่าจะเอา 8 หรือ 10 cells

## Cost Reality

`Long-Life` ไม่ได้แพงขึ้นแค่ตัวแบต แต่กระทบ:

1. enclosure
2. assembly labor
3. waterproofing complexity
4. service procedure

ดังนั้น `Long-Life` ควรเป็น optional SKU ไม่ใช่บังคับทุกเครื่อง
