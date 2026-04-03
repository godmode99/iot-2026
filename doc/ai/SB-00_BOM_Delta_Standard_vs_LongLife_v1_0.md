# SB-00 — BOM Delta: Standard vs Long-Life

**Version 1.0 | April 2026 | Working BOM delta for EX-08A | Last synced: 2026-04-03**

> **Reference baseline:** ใช้คู่กับ [SB-00_Battery_Platform_Interface_Spec_v1_0.md](./SB-00_Battery_Platform_Interface_Spec_v1_0.md), [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md), และ [SB-00_Business_Roadmap_v1_1.md](./SB-00_Business_Roadmap_v1_1.md)

---

## 1. Purpose

เอกสารนี้ใช้สรุปส่วนต่างของ BOM ระหว่าง `Standard` และ `Long-Life` โดยยึดหลักว่า core module, firmware, backend, provisioning, และ sensor stack ใช้ร่วมกัน

## 2. Shared BOM

รายการที่ใช้เหมือนกันทั้งสองรุ่น

1. ESP32-S3 / core board
2. 4G module
3. GPS module
4. sensor stack
5. antenna bulkhead และตำแหน่งติดตั้ง
6. connector ฝั่ง sensor
7. provisioning QR label

## 3. BOM Delta Table

| Area | Standard | Long-Life | ผลกระทบ |
| --- | --- | --- | --- |
| Battery cells | 18650 x2 | 18650 x8-x10 | เพิ่มต้นทุนและน้ำหนัก |
| Battery hardware | holder/parallel pack ขนาดเล็ก | battery module / welded pack / service tray | assembly และ service ซับซ้อนขึ้น |
| Usable capacity | ~5600 mAh | ~23200 mAh | runtime สูงขึ้นมาก |
| Enclosure | baseline `150 × 100 × 60 mm` | ใช้ core footprint เดิม แต่เพิ่ม battery bay / ความลึก | ต้องขอราคา print แยก |
| Service procedure | baseline battery service | service-only upgrade path | ต้องมี SOP ชัด |
| Charging/recovery | USB-C baseline | อาจต้องทบทวนเวลา charge และ service access | งานช่างเพิ่ม |

## 4. Rough Cost Delta

| Cost Item | Standard | Long-Life | Delta |
| --- | --- | --- | --- |
| Battery cells | ~250-300 THB | ~1,200-1,500 THB | `+900 ถึง +1,250 THB` |
| Battery hardware | ~60-80 THB | TBD | เพิ่มตาม pack design |
| Enclosure print | baseline | TBD | เพิ่มตามขนาด battery bay |
| Assembly labor | baseline | TBD | เพิ่มจากการประกอบและ service |

> **หมายเหตุ:** ตัวเลข Long-Life ในเอกสารนี้เป็น working estimate สำหรับการออกแบบและคุยภายใน ยังไม่ใช่ final quote

## 5. Decision Use

เอกสารนี้ใช้ตอบคำถาม 3 ข้อก่อน freeze pilot:

1. Long-Life คุ้มพอเป็น optional SKU หรือไม่
2. battery pack ควรเลือก 8 หรือ 10 cells
3. enclosure extension ควรเพิ่มความลึกเท่าไรจึง balance runtime กับต้นทุน

## 6. Working Conclusion

1. `Standard` ควรเป็นรุ่นหลัก เพราะต้นทุนต่ำและกล่องเล็กกว่า
2. `Long-Life` ควรเป็น optional upgrade / upsell ไม่ควรบังคับทุกเครื่อง
3. การแยกสองรุ่นด้วย battery/enclosure module คุ้มกว่าการแยกเป็นคนละ product line
