# SB-00 — Decision Register

**Version 1.1 | April 2026 | Meeting-ready decisions for SB-00 v1.1 | Last synced: 2026-04-02**

> **Reference baseline:** ใช้คู่กับ [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)

---

เอกสารนี้ใช้สรุป decision ที่กระทบ baseline หลักของโปรเจ็กต์ เพื่อให้ทีมตัดสินใจได้เร็วขึ้นและไม่ต้องย้อนเปิดหลายไฟล์พร้อมกัน

## วิธีใช้

- ดู `Final choice` เป็น baseline ที่ล็อกแล้วสำหรับเอกสาร v1.1
- ถ้าต้องเปลี่ยนจาก `Final choice` ที่ล็อกแล้ว ให้ update [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) ก่อน แล้วค่อย sync เอกสารชุดอื่น
- เมื่อปิด decision แล้ว ให้เปลี่ยน `Status` จาก `Open` เป็น `Closed` พร้อมใส่วันที่และเหตุผลย่อ

## Decision List

| ID | Decision | Status | Owner | Target date |
| --- | --- | --- | --- | --- |
| D-01 | Final enclosure external size | Closed | เอ | 2026-04-02 |
| D-02 | GPS fallback trigger (`L76K` -> `NEO-M8N`) | Closed | พล + เอ | 2026-04-02 |
| D-03 | Provisioning baseline single flow | Closed | พล | 2026-04-02 |
| D-04 | Production 4G sourcing fallback (`A7670E` / `SIM7670E`) | Closed | เอ | 2026-04-02 |
| D-05 | LINE OA paid plan / notification budget trigger | Closed | พล | 2026-04-02 |
| D-06 | Battery platform modular upgrade path | Proposed | พล + เอ | 2026-04-03 |

---

## D-01 Enclosure External Size

| Item | Detail |
| --- | --- |
| Current baseline | Current planning size ประมาณ `150 × 100 × 60 mm` |
| Why it matters | กระทบ PCB outline, 3D print cost, น้ำหนักรวม, buoyancy, การจัดวาง antenna, และ assembly |
| Options | `A)` คงขนาดประมาณ 150×100×60mm ไว้ก่อน, `B)` ลด footprint หลัง PCB layout รอบแรก, `C)` ขยายให้ service/assembly ง่ายขึ้น |
| Final choice | ล็อกขนาด `150 × 100 × 60 mm` เป็น baseline สำหรับ `PCB v1` และ `pilot batch` |
| Reasoning | ลดความเสี่ยง rework ในช่วงต้น และยังเปิดทางให้ optimize footprint หลัง pilot ถ้าข้อมูล buoyancy, thermal, และ assembly บอกว่าควรย่อ |
| If delayed | enclosure, waterproof design, และ procurement จะค้างหลายจุดพร้อมกัน |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md) |

## D-02 GPS Fallback Trigger

| Item | Detail |
| --- | --- |
| Current baseline | ใช้ `L76K` เป็น default ทั้ง prototype และ production; `NEO-M8N` เป็น fallback |
| Why it matters | กระทบ BOM, power budget, enclosure space, antenna placement, และ geofence reliability |
| Options | `A)` ใช้ L76K ต่อไปถ้า field test ผ่าน, `B)` เปลี่ยนเป็น NEO-M8N ทันทีเพื่อความแม่นยำ, `C)` ใช้ L76K ใน pilot แล้วกำหนด trigger ชัดเจนค่อยสลับ |
| Final choice | ใช้ `L76K` ต่อใน prototype และ pilot โดยสลับเป็น `NEO-M8N` เฉพาะเมื่อ median TTFF หลัง wake > 60 วินาที, stationary open-sky error > 15 m มากกว่า 10% ของ sample, หรือ geofence false alert > 2 ครั้ง/เครื่อง/สัปดาห์ |
| Reasoning | เก็บต้นทุนและพลังงานต่ำไว้ก่อน แต่ล็อกเกณฑ์เปลี่ยนให้ชัดเพื่อไม่ให้ทีมตีความคำว่า “accuracy ไม่พอ” ต่างกัน |
| If delayed | ทีมจะคุยเรื่อง GPS กันคนละ assumption และ PCB v2 อาจต้องเผื่อเกินจำเป็น |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md), [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md) |

## D-03 Provisioning Baseline Single Flow

| Item | Detail |
| --- | --- |
| Current baseline | MVP และ pilot ใช้ `QR + Web/PWA` เป็น customer flow เดียว; native app ไม่ใช่ baseline |
| Why it matters | กระทบ onboarding UX, support load, browser compatibility, และ recovery flow ตอน provisioning fail |
| Options | `A)` ทำหลาย flow ตาม browser/device, `B)` ทำ native app เพิ่ม, `C)` ใช้ `QR + Web/PWA` เป็น customer flow เดียว และเก็บ USB/QC ไว้ใช้ภายใน |
| Final choice | ใช้ `QR + Web/PWA` เป็น provisioning baseline เดียวสำหรับ MVP และ pilot; `BLE provisioning` ไม่เป็นส่วนหนึ่งของ customer flow ในเอกสาร v1.1 และถ้าทดลองให้ถือเป็น internal R&D เท่านั้น |
| Reasoning | ลดความสับสนของลูกค้า, ลด support matrix, และทำให้ onboarding, คู่มือ, backend, QC, และ training ใช้ flow เดียวกันทุกอุปกรณ์ |
| If delayed | ฝั่ง firmware, backend, และ onboarding docs จะกลับไปพูดคนละ flow |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md), [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md) |

## D-04 Production 4G Sourcing Fallback

| Item | Detail |
| --- | --- |
| Current baseline | `A7670E` เป็น production default; `SIM7670E` เป็น sourcing fallback |
| Why it matters | กระทบ BOM freeze, PCB footprint, procurement risk, และ firmware compatibility confidence |
| Options | `A)` lock A7670E อย่างเดียว, `B)` lock SIM7670E อย่างเดียว, `C)` ออกแบบเผื่อ fallback โดยยึด A7670E เป็น default |
| Final choice | ยึด `A7670E` เป็น production default และใช้ `SIM7670E` ได้เมื่อ `A7670E` unavailable, lead time > 14 วัน, หรือ price delta > 20% และผ่าน bench validation เรื่อง power-up, MQTT over TLS, และ OTA flow ก่อน freeze BOM |
| Reasoning | ได้สมดุลระหว่าง supply-chain flexibility กับความชัดเจนของเอกสาร และกันการ fallback แบบไม่มีเกณฑ์ |
| If delayed | Procurement กับ PCB design จะเสี่ยงต้องย้อนแก้เมื่อของขาดหรือ lead time เปลี่ยน |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md), [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md) |

## D-05 LINE OA Paid Plan / Notification Budget Trigger

| Item | Detail |
| --- | --- |
| Current baseline | ใช้ free tier ก่อน และ re-check quota/price จริงก่อน commercial launch |
| Why it matters | กระทบ monthly cost planning, alert strategy, และ communication to pilot users |
| Options | `A)` ใช้ free tier จนชน quota แล้วค่อยเลือก plan, `B)` เลือก paid plan ล่วงหน้าเพื่อกันสะดุด, `C)` ลดการพึ่ง LINE โดยดัน web push/in-app มากขึ้น |
| Final choice | ใช้ `LINE free tier` ตลอด pilot และ review paid plan เมื่อ forecast > 200 msg/mo หรือก่อน commercial launch readiness review แล้วแต่ว่าถึงอย่างไหนก่อน |
| Reasoning | ลดค่าใช้จ่ายช่วง pilot แต่ยังล็อก trigger review ให้ชัดว่าต้องกลับมาดูเมื่อไร |
| If delayed | ไม่กระทบ pilot มาก แต่จะทำให้ forecast ต้นทุน commercial launch ไม่แม่น |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md), [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md) |

## D-06 Battery Platform Modular Upgrade Path

| Item | Detail |
| --- | --- |
| Current baseline | battery baseline ปัจจุบันยึด `18650 x2 parallel` เป็นชุดเดียวและ enclosure baseline ขนาด `150 × 100 × 60 mm` |
| Why it matters | กระทบ runtime target, BOM, enclosure size, waterproofing, serviceability, และ product packaging |
| Options | `A)` ใช้ battery pack เดียวกับทุกเครื่อง, `B)` แยกเป็นคนละ product line คนละบอร์ด, `C)` ใช้ core module เดียว แล้วแยก `Standard` / `Long-Life` battery module |
| Proposed choice | ใช้ `core module เดียว + battery module 2 variants` โดย `Standard` เป็น baseline หลัก และ `Long-Life` เป็น service-upgradeable option สำหรับลูกค้าที่ต้องการ runtime สูงขึ้น |
| Reasoning | ลดการแตก product line, คุม firmware/backend/provisioning ให้เป็นชุดเดียว, และเปิดทาง upsell รุ่นแบตอึดโดยไม่บวมต้นทุนทุกเครื่อง |
| Required constraints | battery connector ต้องเป็นมาตรฐานเดียว, board mounting เดียว, firmware ต้องมี `battery_profile`, enclosure ต้องแยกชิ้นส่วนเฉพาะส่วน battery ได้, และการอัปเกรดภาคสนามควรเป็น service-upgradeable ไม่ใช่ user-openable |
| Review point | ปิด decision ก่อน freeze PCB v1, enclosure v1, และ procurement ของ pilot |
| Related docs | [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md), [SB-00_Firmware_Hardware_v1_1.md](./SB-00_Firmware_Hardware_v1_1.md), [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md), [SB-00_Execution_Task_List_v1_1.md](./SB-00_Execution_Task_List_v1_1.md) |

---

## Decision Close Log

| ID | Closed on | Final choice | Notes |
| --- | --- | --- | --- |
| D-01 | 2026-04-02 | ล็อก enclosure `150×100×60 mm` สำหรับ PCB v1 + pilot batch | optimize หลัง pilot เท่านั้น |
| D-02 | 2026-04-02 | ใช้ `L76K` ต่อ พร้อม trigger เปลี่ยนเป็น `NEO-M8N` แบบวัดผลได้ | trigger อยู่ใน Master Assumptions |
| D-03 | 2026-04-02 | provisioning baseline = `QR + Web/PWA` flow เดียว | USB/QC ใช้ภายในเท่านั้น; BLE ไม่ใช่ customer baseline |
| D-04 | 2026-04-02 | `A7670E` default, `SIM7670E` conditional fallback | ต้อง bench validation ก่อน freeze BOM |
| D-05 | 2026-04-02 | ใช้ `LINE free tier` ตลอด pilot | review ใหม่เมื่อ forecast > 200 msg/mo หรือก่อน commercial launch |
| D-06 | 2026-04-03 | proposed: `core module เดียว + 2 battery variants` | ต้องปิดก่อน freeze PCB/enclosure |
