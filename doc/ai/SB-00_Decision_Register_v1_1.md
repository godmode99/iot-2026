# SB-00 — Decision Register

**Version 1.1 | April 2026 | Meeting-ready decisions for SB-00 v1.1 | Last synced: 2026-04-02**

> **Reference baseline:** ใช้คู่กับ [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)

---

เอกสารนี้ใช้สรุป decision ที่ยังต้องปิด เพื่อให้การประชุมทีมตัดสินใจได้เร็วขึ้นและไม่ต้องย้อนเปิดหลายไฟล์พร้อมกัน

## วิธีใช้

- ดู `Recommendation` เป็นทางเลือกที่สอดคล้องกับ baseline ปัจจุบันของเอกสาร
- ถ้าตัดสินใจเปลี่ยนจาก recommendation ให้ update [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) ก่อน แล้วค่อย sync เอกสารชุดอื่น
- เมื่อปิด decision แล้ว ให้เปลี่ยน `Status` จาก `Open` เป็น `Closed` พร้อมใส่วันที่และเหตุผลย่อ

## Decision List

| ID | Decision | Status | Owner | Target date |
| --- | --- | --- | --- | --- |
| D-01 | Final enclosure external size | Open | เอ | ก่อนสั่ง PCB v1 |
| D-02 | GPS fallback trigger (`L76K` -> `NEO-M8N`) | Open | พล + เอ | ก่อน freeze PCB v2 |
| D-03 | BLE provisioning support matrix | Open | พล | ก่อน implement onboarding Phase 2 |
| D-04 | Production 4G sourcing fallback (`A7670E` / `SIM7670E`) | Open | เอ | ก่อน freeze production BOM |
| D-05 | LINE OA paid plan / notification budget trigger | Open | พล | ก่อน launch readiness review |

---

## D-01 Enclosure External Size

| Item | Detail |
| --- | --- |
| Current baseline | Current planning size ประมาณ `150 × 100 × 60 mm` |
| Why it matters | กระทบ PCB outline, 3D print cost, น้ำหนักรวม, buoyancy, การจัดวาง antenna, และ assembly |
| Options | `A)` คงขนาดประมาณ 150×100×60mm ไว้ก่อน, `B)` ลด footprint หลัง PCB layout รอบแรก, `C)` ขยายให้ service/assembly ง่ายขึ้น |
| Recommendation | `A)` คง planning size เดิมไว้ก่อนจนกว่าจะมี PCB layout รอบแรก แล้วค่อยตัดสินใจรอบสุดท้าย |
| Reasoning | ลดความเสี่ยง rework ในช่วงต้น และยังเปิดทางให้ย่อกล่องภายหลังเมื่อรู้ component placement จริง |
| If delayed | enclosure, waterproof design, และ procurement จะค้างหลายจุดพร้อมกัน |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md) |

## D-02 GPS Fallback Trigger

| Item | Detail |
| --- | --- |
| Current baseline | ใช้ `L76K` เป็น default ทั้ง prototype และ production; `NEO-M8N` เป็น fallback |
| Why it matters | กระทบ BOM, power budget, enclosure space, antenna placement, และ geofence reliability |
| Options | `A)` ใช้ L76K ต่อไปถ้า field test ผ่าน, `B)` เปลี่ยนเป็น NEO-M8N ทันทีเพื่อความแม่นยำ, `C)` ใช้ L76K ใน pilot แล้วกำหนด trigger ชัดเจนค่อยสลับ |
| Recommendation | `C)` ใช้ L76K ใน pilot และกำหนด trigger ชัดเจน เช่น fix time, accuracy, และ geofence false alert rate |
| Reasoning | เก็บต้นทุนต่ำไว้ก่อน แต่ไม่ปล่อยให้ decision ค้างแบบไม่มีเกณฑ์ |
| If delayed | ทีมจะคุยเรื่อง GPS กันคนละ assumption และ PCB v2 อาจต้องเผื่อเกินจำเป็น |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md), [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md) |

## D-03 BLE Provisioning Support Matrix

| Item | Detail |
| --- | --- |
| Current baseline | MVP ใช้ `QR + Web/PWA`; Phase 2+ ใช้ `BLE ผ่าน mobile PWA/Web Bluetooth`; native app ไม่ใช่ baseline |
| Why it matters | กระทบ onboarding UX, support load, browser compatibility, และ recovery flow ตอน provisioning fail |
| Options | `A)` รองรับเฉพาะ mobile PWA/Web Bluetooth + USB fallback, `B)` ทำ native app เพิ่ม, `C)` ยกเลิก BLE แล้วใช้ factory-only provisioning |
| Recommendation | `A)` รองรับ mobile PWA/Web Bluetooth เป็นหลัก และเขียน fallback matrix ให้ชัดว่า browser/device ไหนใช้ได้ |
| Reasoning | สอดคล้องกับ roadmap ที่ดัน PWA ก่อน app และยังคุม scope ได้ |
| If delayed | ฝั่ง firmware, backend, และ onboarding docs จะกลับไปพูดคนละ flow |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md), [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md) |

## D-04 Production 4G Sourcing Fallback

| Item | Detail |
| --- | --- |
| Current baseline | `A7670E` เป็น production default; `SIM7670E` เป็น sourcing fallback |
| Why it matters | กระทบ BOM freeze, PCB footprint, procurement risk, และ firmware compatibility confidence |
| Options | `A)` lock A7670E อย่างเดียว, `B)` lock SIM7670E อย่างเดียว, `C)` ออกแบบเผื่อ fallback โดยยึด A7670E เป็น default |
| Recommendation | `C)` ยึด A7670E เป็น default แต่ตรวจ footprint/assembly compatibility สำหรับ fallback ให้ครบก่อน freeze BOM |
| Reasoning | ได้สมดุลระหว่าง supply-chain flexibility กับความชัดเจนของเอกสาร |
| If delayed | Procurement กับ PCB design จะเสี่ยงต้องย้อนแก้เมื่อของขาดหรือ lead time เปลี่ยน |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md), [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md) |

## D-05 LINE OA Paid Plan / Notification Budget Trigger

| Item | Detail |
| --- | --- |
| Current baseline | ใช้ free tier ก่อน และ re-check quota/price จริงก่อน commercial launch |
| Why it matters | กระทบ monthly cost planning, alert strategy, และ communication to pilot users |
| Options | `A)` ใช้ free tier จนชน quota แล้วค่อยเลือก plan, `B)` เลือก paid plan ล่วงหน้าเพื่อกันสะดุด, `C)` ลดการพึ่ง LINE โดยดัน web push/in-app มากขึ้น |
| Recommendation | `A)` ใช้ free tier ระหว่าง pilot และ review quota/price จริงอีกครั้งใน launch readiness review |
| Reasoning | ลดค่าใช้จ่ายช่วง pilot และเลื่อนการตัดสินใจที่ขึ้นกับราคา live ไปใกล้เวลาที่ต้องใช้จริง |
| If delayed | ไม่กระทบ pilot มาก แต่จะทำให้ forecast ต้นทุน commercial launch ไม่แม่น |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md), [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md) |

---

## Decision Close Log

| ID | Closed on | Final choice | Notes |
| --- | --- | --- | --- |
| D-01 | — | — | — |
| D-02 | — | — | — |
| D-03 | — | — | — |
| D-04 | — | — | — |
| D-05 | — | — | — |
