# SB-00 AquaSense IoT — Business & Roadmap

**Version 1.1 | March 2026 | Confidential**

> **Reference baseline:** เอกสารนี้อ้างอิงสมมติฐานกลางใน [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) | **Last synced:** 2026-04-02

---

# 9. Business Model

## 9.1 Revenue Streams

| Stream            | รายละเอียด                                 | ราคา                     | Cost                   | Margin  |
| ----------------- | ------------------------------------------ | ------------------------ | ---------------------- | ------- |
| Hardware          | SB-00 Node (เครื่อง + sensors + enclosure) | 4,500-6,000 THB/unit     | ~2,725 THB (COGS)      | 39-54%  |
| SaaS Basic        | Dashboard, alerts, 90-day data             | 299 THB/mo/farm          | ~54 THB/mo (infra)     | ~82%    |
| SaaS Pro          | + Analytics, API, 1-year data, multi-user  | 599 THB/mo/farm          | ~54 THB/mo (infra)     | ~91%    |
| SIM Data          | 4G IoT SIM (resell bulk AIS/TRUE)          | 99-199 THB/mo            | ~25 THB/mo (bulk rate) | ~60-87% |
| Replacement Parts | Sensors, batteries, cables                 | ตามชิ้น (mark up 30-50%) | ต้นทุน BOM             | 30-50%  |

## 9.2 SaaS Plan Features

| Feature             | Free Trial (30 วัน) | Pause (99 THB/mo)      | Basic (299 THB/mo)          | Pro (599 THB/mo)          |
| ------------------- | ------------------- | ---------------------- | --------------------------- | ------------------------- |
| จำนวน devices       | 1 device            | ทุก device (read-only) | ไม่จำกัด                    | ไม่จำกัด                  |
| Data retention      | 7 วัน               | เก็บแต่ไม่แสดง         | 90 วัน raw + hourly forever | 1 ปี raw + hourly forever |
| Real-time dashboard | ใช่                 | ไม่มี (frozen)         | ใช่                         | ใช่                       |
| GPS map             | ใช่                 | ใช่ (last known)       | ใช่                         | ใช่                       |
| Alert rules         | 2 rules             | ปิดทั้งหมด             | 10 rules                    | ไม่จำกัด                  |
| Notification        | LINE เท่านั้น       | ไม่มี                  | LINE + Email                | LINE + Email + Web Push   |
| Team members        | 1 คน                | 1 คน                   | 3 คน                        | ไม่จำกัด                  |
| Data export (CSV)   | ไม่มี               | ไม่มี                  | มี (max 30 วัน)             | มี (ไม่จำกัด)             |
| Monthly PDF report  | ไม่มี               | ไม่มี                  | ไม่มี                       | มี (auto ทุกเดือน)        |
| API access          | ไม่มี               | ไม่มี                  | ไม่มี                       | มี (1,000 req/วัน)        |
| OTA firmware update | ไม่มี               | ไม่มี                  | มี                          | มี                        |
| Support             | LINE OA             | LINE OA                | LINE OA priority            | LINE OA + email priority  |

> **หมายเหตุ:** Pause Plan: สำหรับลูกค้าที่หยุดเลี้ยงนอกฤดูกาล — จ่ายแค่ 99 THB/mo เพื่อรักษา account + data ไว้ ไม่ต้อง cancel แล้วสมัครใหม่

### Free Trial Policy

| รายการ              | นโยบาย                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------- |
| ระยะเวลา            | 30 วันนับจากวันลงทะเบียน device แรก                                                       |
| ต้องใส่ card ไหม    | ไม่ต้องใส่ card — no credit card required                                                 |
| หลังหมด trial       | ระบบแจ้งเตือน 7 วันก่อนหมด + วันสุดท้าย → ถ้าไม่ upgrade จะ downgrade to Free (read-only) |
| Convert to paid     | กด upgrade ใน dashboard → เลือก plan → Stripe / Omise → activate ทันที                    |
| Data ถ้าไม่ upgrade | เก็บไว้ 7 วันหลังหมด trial → ถ้าไม่ upgrade จะลบ                                          |

## 9.3 BOM ต้นทุนต่อเครื่อง

> **หมายเหตุ:** section นี้แยก `Prototype Reference` ออกจาก `Production BOM` ชัดเจน เพื่อไม่ให้ใช้ dev board ไปปนกับต้นทุนขายจริง
>
> ราคาทั้งหมดเป็น internal planning assumptions อ้างอิงรอบเอกสารนี้ — ก่อน commercial launch ต้อง re-check ราคา component และ service ที่เปลี่ยนตามตลาดอีกครั้ง

### Prototype Reference (Phase 1 — ใช้ทดสอบ ไม่ใช้คิด COGS)

| Area | Baseline | หมายเหตุ |
| --- | --- | --- |
| MCU + 4G | FS-HCore-A7670C | dev board สำหรับ firmware/hardware test |
| GPS | L76K | baseline เดียวกับ production |
| Temperature | DS18B20 | ใช้ทั้ง prototype และ production |
| Turbidity | Analog sensor | ใช้ dev/test เท่านั้น ไม่ใช่ production sensor |
| Power | 18650 x2 + holder/charger | baseline เดียวกับ production |

### Production BOM Reference (Phase 2+ — ใช้คำนวณ COGS)

| Component                                           | ราคา (THB) | แหล่งซื้อ / หมายเหตุ                                                           |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| ESP32-S3 WROOM-1                                    | 120        | LCSC / JLCPCB                                                                   |
| A7670E module                                       | 180        | production default — `SIM7670E` เป็น sourcing fallback ถ้าหาซื้อหรือ assembly สะดวกกว่า |
| DS18B20 Waterproof x1                               | 70         | LCSC / Shopee                                                                  |
| Turbidity Sensor (Production: SEN0600 RS485)        | 913        | production default — analog ใช้เฉพาะ Phase 1 dev/test                         |
| MAX485 transceiver                                  | 15         | LCSC                                                                           |
| GPS Module (L76K default)                           | 150        | production default — `NEO-M8N` ใช้เมื่อ field test ชี้ว่า L76K ไม่พอ            |
| 18650 Battery x2                                    | 300        | ร้านไทย / Shopee                                                               |
| Battery holder + charger (TP4056)                   | 80         | LCSC / Shopee                                                                  |
| Bulk capacitor 470µF                                | 10         | LCSC / บางลำพู                                                                 |
| PCB (custom, qty 100)                               | 60         | JLCPCB                                                                         |
| Enclosure IP67 (3D print จากร้านรับ print — ASA/PC) | 200-400    | ร้านรับ print 3D ในไทย                                                         |
| Cable glands, connectors, wiring                    | 100        | ร้านไทย                                                                        |
| SIM card slot + antenna                             | 80         | LCSC                                                                           |
| Misc (resistors, MOSFET, LDO, etc.)                 | 60         | LCSC / บางลำพู                                                                 |
| Total BOM                                           | ~2,338-2,538 | ขึ้นกับ enclosure final size                                                  |
| Assembly + testing labor                            | 350        |                                                                                |
| Total COGS                                          | ~2,688-2,888 |                                                                                |

> **หมายเหตุ:** Margin: ขาย 4,500-6,000 THB → gross margin ประมาณ 36-55% ก่อนหัก overhead ขึ้นกับ enclosure final size และต้นทุน production จริง — ที่ batch 500+ ชิ้น BOM ลดได้อีก ~15% จาก volume discount

## 9.4 Pricing Strategy & Justification

### Hardware Pricing

| ราคา                       | เหตุผล                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------- |
| 4,500 THB (entry)          | ต้นทุน COGS ~2,725 + margin — แข่งขันได้กับ import solutions ราคา 8,000-15,000 THB |
| 6,000 THB (premium bundle) | รวม mounting hardware (ทุ่น/bracket) + warranty 1 ปี + installation support        |

### SaaS Pricing

- Basic 299 THB/mo (~$8.5) — ต่ำกว่า global IoT SaaS ที่ $15-30/mo แต่เหมาะกับกำลังซื้อเกษตรกรไทย
- Pro 599 THB/mo — 2x basic สำหรับลูกค้าที่ต้องการ API + analytics เช่น นักวิจัย, บริษัทประมง
- ยังไม่มี competitor โดยตรงในไทยสำหรับ IoT หอยแครง — pricing power สูง

## 9.5 Break-even Analysis (ปรับปรุง)

### Upfront Fixed Costs

| รายการ                               | ค่าใช้จ่าย (THB) | หมายเหตุ                                                |
| ------------------------------------ | ---------------- | ------------------------------------------------------- |
| กสทช. certification                  | 15,000           | จำเป็นก่อน commercial/public launch                     |
| IP67 testing (ห้องแล็บ)              | 10,000           | ยังไม่รวมในงบ — ยื่นพร้อม กสทช. เมื่อพร้อม ทดสอบเองก่อน |
| 3D Printer (ลงทุนครั้งเดียว Phase 1) | 10,000           | เอซื้อเองสำหรับ prototype รวม filament                  |
| PCB batch 50-100 ชิ้น (JLCPCB PCBA)  | 25,000           |                                                         |
| Marketing (website, content, ads)    | 20,000           | landing page + YouTube + ads เริ่มต้น                   |
| Legal (terms, privacy policy)        | 0                | ใช้ template ฟรีออนไลน์ — ไม่จ้างทนายความ               |
| รวม Upfront                          | ~80,000          | เป็น deferred commercialization cost — คนละก้อนกับงบ Phase 1-3 (~28,700) |

### Monthly Fixed Costs (หลัง launch)

| รายการ                      | ค่าใช้จ่าย (THB/เดือน) | หมายเหตุ                     |
| --------------------------- | ---------------------- | ---------------------------- |
| Infrastructure (50 devices) | ~3,000                 | ดู section 6.1.6             |
| Customer support            | ~2,000                 | เวลาผู้ก่อตั้ง ~10 ชม./เดือน |
| Marketing ongoing           | ~3,000                 | social media ads, content    |
| Misc (domain, tools, etc.)  | ~500                   |                              |
| รวม Monthly Fixed           | ~8,500                 | ยังไม่รวม founder salary     |

### Break-even Calculation

| Scenario                   | จำนวน          | Revenue/เดือน            | Break-even                              |
| -------------------------- | -------------- | ------------------------ | --------------------------------------- |
| Hardware only (ไม่มี SaaS) | ~111 เครื่อง   | —                        | 225,000 ÷ 2,025 net/unit = ~111 เครื่อง |
| Hardware + SaaS Basic      | ~75 เครื่อง    | 299 × 75 = 22,425 THB    | Upfront + monthly covered เร็วขึ้น      |
| Realistic (mixed)          | ~80-90 เครื่อง | ~25,000-30,000 THB/เดือน | ภายใน 12-18 เดือนหลัง launch            |

> **หมายเหตุ:** break-even table นี้ใช้ commercialization scenario เต็มรูปแบบ ไม่ใช่งบ prototype/pilot Phase 1-3

## 9.6 Customer Acquisition & Retention

### Customer Acquisition Cost (CAC) ประมาณการ

| Channel                          | CAC ประมาณ    | หมายเหตุ                          |
| -------------------------------- | ------------- | --------------------------------- |
| Direct sales (ไปหาเกษตรกรโดยตรง) | 500-1,000 THB | เวลา + เดินทาง — ใช้ Phase 3      |
| Word of mouth                    | 0 THB         | ลูกค้าพาลูกค้า — เป้าหมายระยะยาว  |
| Facebook/LINE ads                | 800-2,000 THB | targeting กลุ่มเกษตรกร/ประมง      |
| YouTube content                  | 200-500 THB   | ต้นทุนต่ำถ้าทำเอง — long-term SEO |
| Target CAC                       | < 1,500 THB   | LTV ต้องสูงกว่า CAC 3-5x          |

### Customer Lifetime Value (LTV)

- LTV = (SaaS revenue/เดือน × avg. subscription months) + hardware margin
- ถ้าลูกค้าใช้ Basic 299 THB/mo นาน 24 เดือน = 7,176 THB SaaS + ~2,025 THB hardware = ~9,200 THB
- LTV/CAC ratio เป้าหมาย: > 3x — ที่ CAC 1,500 THB และ LTV 9,200 THB = ratio 6.1x ดีมาก

### Churn Risk & Retention Strategy

| ความเสี่ยง       | สาเหตุ                      | Strategy รับมือ                                         |
| ---------------- | --------------------------- | ------------------------------------------------------- |
| Hardware churn   | เครื่องเสีย ลูกค้าหยุดใช้   | Warranty 1 ปี + repair service + replacement parts      |
| SaaS churn       | ราคาแพงเกิน / ไม่เห็น value | แสดง ROI ใน dashboard เช่น ลดการสูญเสียจากน้ำร้อน X บาท |
| Technology churn | ลูกค้าย้ายไปใช้ competitor  | Lock-in ผ่าน historical data + sensor mapping ที่ทำไว้  |
| Seasonal churn   | หน้านอกฤดูเพาะเลี้ยง        | เสนอ pause plan แทน cancel — เก็บแค่ 99 THB/mo          |

## 9.7 Hardware Warranty Policy

| รายการ            | นโยบาย                                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| ระยะเวลา warranty | 1 ปีนับจากวันส่งมอบ                                                        |
| ครอบคลุม          | ข้อบกพร่องจากการผลิต, PCB failure, enclosure seal failure                  |
| ไม่ครอบคลุม       | ความเสียหายจากการใช้งานผิดวัตถุประสงค์, probe ถูกทำลาย, battery หมดตามอายุ |
| การ claim         | ถ่ายรูป + อธิบายปัญหา → ส่งทาง LINE OA → ทีมประเมิน → เปลี่ยนหรือซ่อม      |
| Replacement time  | ส่งของทดแทนภายใน 7 วันทำการ                                                |
| Battery           | รับประกัน 6 เดือน (อายุใช้งานจำกัด)                                        |
| Sensor probes     | รับประกัน 6 เดือน — แนะนำซื้อสำรองไว้                                      |

## 9.8 Competitive Landscape

ยังไม่มี direct competitor ที่ทำ IoT เฉพาะหอยแครง/สัตว์น้ำในไทย — แต่มี indirect competitors ที่ต้องตระหนัก

| Competitor                                 | ประเภท                         | จุดแข็ง             | จุดอ่อน                                     | กลยุทธ์รับมือ                         |
| ------------------------------------------ | ------------------------------ | ------------------- | ------------------------------------------- | ------------------------------------- |
| General IoT platforms (Blynk, ThingsBoard) | Indirect — general purpose IoT | ราคาถูก, setup เร็ว | ไม่ specific กับสัตว์น้ำ, ต้องตั้งค่าเอง    | เน้น domain knowledge + plug-and-play |
| Imported aquaculture sensors (จีน/ไต้หวัน) | Indirect — hardware only       | ราคาถูก             | ไม่มี software/dashboard, ไม่มี support ไทย | เน้น complete solution + Thai support |
| Manual monitoring (วัดด้วยมือ)             | Indirect — traditional         | ต้นทุนต่ำ           | ใช้เวลา, error สูง, ไม่มี alert             | แสดง ROI จากการลดการสูญเสีย           |
| University/research IoT projects           | Indirect — non-commercial      | ทำงานได้            | ไม่มี support, ไม่ stable, ไม่มีหลังการขาย  | เน้น reliability + warranty + support |
| Future competitors                         | Unknown                        | ?                   | ยังไม่มี                                    | สร้าง brand + customer base ให้เร็ว   |

## 9.9 Go-to-Market Strategy

### Phase 1-2 (Prototype → MVP): Early Adopters

1. เข้าหาเกษตรกรที่รู้จักโดยตรง — เริ่ม 3-5 ราย ให้ใช้ฟรีแลกกับ feedback
1. ติดตั้งให้ฟรีในช่วง beta — เรียนรู้ pain points จริงๆ
1. ถ่ายวิดีโอ case study + testimonial จากลูกค้าจริง
1. สร้าง LINE Group สำหรับ beta users — community เริ่มต้น

### Phase 3 (Pilot / Launch Readiness): Demand Validation

1. Landing page + SEO keywords: 'IoT หอยแครง', 'วัดคุณภาพน้ำ', 'sensor บ่อ'
1. YouTube channel: วิดีโอติดตั้ง + case study + tips เลี้ยงหอยแครง
1. Facebook/LINE ads targeting: เกษตรกร, กลุ่มประมง, กลุ่มเลี้ยงสัตว์น้ำ
1. ติดต่อสหกรณ์ประมง + กรมประมง — channel partnership
1. Word of mouth: offer referral discount 200 THB ต่อการแนะนำลูกค้าใหม่

| Channel              | เป้าหมาย (Phase 3)                         | KPI                   |
| -------------------- | ------------------------------------------ | --------------------- |
| Direct sales         | 10 farms ใน pipeline / waitlist หลัง pilot | conversion rate > 30% |
| YouTube              | 1,000 subscribers ใน 6 เดือน         | view-to-lead rate     |
| Facebook/LINE ads    | CAC < 1,500 THB                      | ROAS > 3x             |
| Referral program     | 20% ของ new customers มาจาก referral | referral rate         |
| Partnership (สหกรณ์) | 1 สหกรณ์ pilot ใน 6 เดือน            | # farms จากช่องทางนี้ |

## 9.10 Refund Policy

| กรณี                                 | นโยบาย                                                |
| ------------------------------------ | ----------------------------------------------------- |
| Hardware — DOA (Dead on Arrival)     | เปลี่ยนเครื่องใหม่ทันทีภายใน 7 วัน โดยไม่มีค่าใช้จ่าย |
| Hardware — ไม่พอใจ (7 วันแรก)        | คืนเงิน 100% ถ้าส่งคืนสภาพดีภายใน 7 วันหลังรับของ     |
| Hardware — หลัง 7 วัน                | ไม่รับคืน — ใช้ warranty process แทน                  |
| SaaS — trial period                  | ไม่มีค่าใช้จ่าย — cancel ได้ทุกเวลา                   |
| SaaS — paid (ภายใน 3 วันแรกของเดือน) | คืนเงิน pro-rata ถ้าแจ้งภายใน 3 วันแรกของรอบบิล       |
| SaaS — paid (หลัง 3 วัน)             | ไม่คืนเงิน — ยกเลิกจะมีผลรอบบิลถัดไป                  |
| SIM card                             | ไม่รับคืนหลัง activate — เป็นนโยบายของ operator       |

# 10. Development Roadmap

## 10.0 Timeline Summary

สมมติเริ่ม April 2026 — Phase 1-3 ใช้เวลา ~6.5 เดือน พร้อม pilot และ launch readiness ราว October 2026 โดย commercial launch ทำหลัง กสทช. อนุมัติ

| Phase                                      | ช่วงเวลา       | ระยะเวลา    | งบ (THB)                         | Strategy หลัก                                                                                      | Milestone                                               |
| ------------------------------------------ | -------------- | ----------- | -------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Phase 1 — Prototype & Full Test            | Apr - Jun 2026 | 10 สัปดาห์  | ~20,400 (พล ~4,400 / เอ ~16,000) | พลใช้ ESP32-S3 DevKit ทดสอบ firmware + เอใช้ FS-HCore ทดสอบ hardware — parallel ได้                | ทุก function ผ่าน + engineering field test 1 สัปดาห์    |
| Phase 2 — PCB Development                  | Jun - Aug 2026 | 8 สัปดาห์   | ~4,000                           | PCB v1→v2→v3 (10 ชิ้น/รุ่น ~500 THB) หลัง firmware นิ่ง — IP67 ทดสอบเองในบ่อ + เริ่มยื่น กสทช.     | PCB pilot-batch ready + batch 10 ชิ้น QC ผ่าน           |
| Phase 3 — Pilot & Launch Readiness         | Sep - Oct 2026 | 8 สัปดาห์   | ~4,300                           | รัน pilot 30 วัน, ปิด bug, เตรียมเอกสารขาย, เก็บ waitlist — ยังไม่เปิด commercial/public sale ก่อน กสทช. | 3-5 pilot farms + waitlist / pipeline 10 farms          |
| Phase 4 — Scale                 | Nov 2026+      | Ongoing     | ขึ้นกับ revenue                  | PWA + pH/DO sensor ก่อน — ตาม priority P1-P4                                        | P1 features ใน 3 เดือนแรก                    |
| รวม Phase 1-3                   | Apr - Oct 2026 | ~26 สัปดาห์ | ~28,700                          | ไม่รวม กสทช. + marketing                                                            | Break-even ~16 เครื่อง                       |

| Phase             | รายการ                                                  | ค่าใช้จ่าย (THB) | หมายเหตุ                                             |
| ----------------- | ------------------------------------------------------- | ---------------- | ---------------------------------------------------- |
| Phase 1 (เอ)      | 3D Printer (ลงทุนครั้งเดียว รวม filament)               | 10,000           | เอซื้อเอง ใช้ได้ตลอด project                         |
| Phase 1 (เอ)      | FS-HCore-A7670C dev board                               | 550              | ESP32-S3 + SIM7670C — เอใช้ทดสอบ hardware จริง       |
| Phase 1 (พล)      | ESP32-S3 DevKit                                         | 250              | พลใช้ทดสอบ firmware logic บน breadboard              |
| Phase 1 (ทั้งคู่) | Sensors ×2 ชุด (DS18B20, Analog Turbidity, GPS, MAX485) | 1,600            | พล 1 ชุด + เอ 1 ชุด + DS18B20 สำรอง                  |
| Phase 1 (ทั้งคู่) | Modules ×2 ชุด (MAX17048, MT3608, Level Shifter)        | 300              | คนละชุด                                              |
| Phase 1 (พล)      | Multimeter + Logic Analyzer + USB-TTL + ESD             | 1,160            | เครื่องมือ debug firmware                            |
| Phase 1 (เอ)      | เครื่องมือบัดกรี + assembly ทั้งหมด                     | 1,720            | พลไม่บัดกรี — เอรับผิดชอบ                            |
| Phase 1 (ทั้งคู่) | Breadboard + passive components ×2 ชุด                  | 1,410            | คนละชุด                                              |
| Phase 1 (พล)      | Battery + TP4056 + holder                               | 410              | ทดสอบ deep sleep + power logic                       |
| Phase 1 (เอ)      | Antenna + SMA bulkhead + pigtail                        | 290              | งาน RF/enclosure ของเอ                               |
| Phase 1 (เอ)      | Waterproof materials + น้ำกลั่น                         | 575              | งาน assembly ของเอ                                   |
| Phase 1 (เอ)      | SIM cards 3 operator (AIS/TRUE/DTAC)                    | 200              | ใช้กับ FS-HCore ของเอ                                |
| Phase 1 (เอ)      | Connectors + wiring + hot glue                          | 940              | งาน wiring/assembly ของเอ                            |
| Phase 1 (พล)      | Domain name                                             | 650              | พลจัดการ                                             |
| Phase 1 (พล)      | Upstash QStash (3 เดือน)                                | 432              | ~144/เดือน พลจัดการ                                  |
| Phase 1           | **รวม Phase 1 (พล ~4,400 + เอ ~16,000)**                | **~20,400**      | **แยกรายละเอียด → ดู Procurement List section 1.10** |
| Phase 2           | PCB v1 (JLCPCB 10 ชิ้น)                                 | 500              |                                                      |
| Phase 2           | PCB v2 (JLCPCB 10 ชิ้น)                                 | 500              | แก้ issue จาก v1                                     |
| Phase 2           | PCB v3 ถ้าจำเป็น (JLCPCB 10 ชิ้น)                       | 500              | optional                                             |
| Phase 2           | Components 1 ชุด สำหรับประกอบทดสอบ PCB                  | 2,500            | ซื้อตามจริง ไม่ตุน                                   |
| Phase 2           | รวม Phase 2                                             | ~4,000           |                                                      |
| Phase 3           | PCB batch 10 ชิ้น production (JLCPCB)                   | 500              | สั่งตามออเดอร์ ไม่ตุน                                |
| Phase 3           | Components 1 ชุด สำหรับ production                      | 2,500            |                                                      |
| Phase 3           | 3D Print จากร้าน ASA 2 ชิ้น (วางแสดง)                   | 800              | ~400 THB/ชิ้น — อัพเดตเมื่อมีไฟล์ 3D จริง            |
| Phase 3           | Terms of Service + Privacy Policy                       | 0                | ใช้ template ฟรีออนไลน์                              |
| Phase 3           | Omise + Stripe (ไม่มี setup fee)                        | 0                | จ่ายแค่ transaction fee ~3.6%                        |
| Phase 3           | ค่าใช้จ่ายเบ็ดเตล็ด                                     | 500              |                                                      |
| Phase 3           | รวม Phase 3                                             | ~4,300           |                                                      |
| รวมทั้งหมด        | Phase 1-3                                               | ~28,700          | ไม่รวม กสทช. + marketing — เพิ่มเมื่อพร้อม           |

> **หมายเหตุ:** กสทช. (~15,000 THB) และ marketing ยังไม่รวมในงบนี้ — เริ่มเตรียม/ยื่น กสทช. ช่วงปลาย Phase 2 ถึงต้น Phase 3 ส่วน marketing ช่วงแรกใช้ word of mouth + ฟาร์มของตัวเองเป็น showcase ก่อน

## 10.1 Team & Responsibilities

| คน  | รับผิดชอบหลัก                                                            | รับผิดชอบรอง                         |
| --- | ------------------------------------------------------------------------ | ------------------------------------ |
| พล  | ESP-IDF firmware, MQTT, backend API, Vercel, Supabase, dashboard         | PCB review, component sourcing       |
| เอ  | PCB schematic/layout, enclosure 3D design, assembly, UI/UX design, Figma | Firmware testing, field installation |

> **หมายเหตุ:** Critical dependency: พลเริ่ม firmware ได้ทันทีบน ESP32-S3 DevKit (breadboard ไม่บัดกรี) — เอเริ่ม hardware ได้ทันทีบน FS-HCore-A7670C — ทั้งสองทำงาน parallel ได้ใน Phase 1 ตลอด

## Phase 1 — Prototype & Full Function Test (สัปดาห์ที่ 1-10)

> **หมายเหตุ:** หลักการ Phase 1: พลใช้ ESP32-S3 DevKit + breadboard ทดสอบ firmware (ไม่บัดกรี ~4,400 THB) — เอใช้ FS-HCore-A7670C ทดสอบ hardware จริง + assembly ทั้งหมด (~16,000 THB) — ทำ parallel ได้ตลอด — งบรวม ~20,400 THB

| สัปดาห์ | พล (Server + Firmware)                                                                      | เอ (Hardware + Design)                                                        | Dependency      |
| ------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------- |
| 1-2     | Setup ESP-IDF + อ่าน DS18B20 + Analog Turbidity (ADC) + GPS บน ESP32-S3 DevKit + breadboard | สั่งซื้อ components + เปิดเครื่อง 3D printer 10,000 THB + ทดสอบพิมพ์เบื้องต้น | ทำ parallel ได้ |
| 2-3     | Firmware ส่ง MQTT + Setup Vercel + Supabase + basic API                                     | 3D print enclosure v1 (PLA) + ทดสอบ layout ภายใน + ใส่ board ลองดู            | ทำ parallel ได้ |
| 3-4     | Dashboard: real-time + GPS map + set interval                                               | ทดสอบ waterproof — จุ่มน้ำ + ตรวจ seal + ปรับ cable gland                     | ทำ parallel ได้ |
| 4-5     | Firmware: PSM mode + battery estimation + buffer/flush + NTP sync                           | 3D print enclosure v2 (แก้ issue) + ทดสอบ waterproof ซ้ำในบ่อ                 | ทำ parallel ได้ |
| 5-6     | Firmware: OTA update + Flash Encryption + Secure Boot + watchdog + safe mode                | 3D print mounting hardware — ทุ่น + bracket + ไม้ปัก + ทดสอบ config A/B/C     | ทำ parallel ได้ |
| 6-7     | Backend: alert system + command pipeline + calibration API                                  | ออกแบบ UI ใน Figma — dashboard, mobile-first layout                           | ทำ parallel ได้ |
| 7-8     | Dashboard: alert UI + historical charts + LINE integration + provisioning                   | Review Figma กับพล + ปรับแก้จนพอใจ                                            | พลรอ Figma      |
| 8-9     | Firmware: provisioning hardening (QR/Web), error recovery + payment API + self-pentest      | Turbidity calibration (น้ำกลั่น reference) + ทดสอบ sensor ใน field            | ทำ parallel ได้ |
| 9-10    | Engineering field test 1 สัปดาห์ในบ่อจริง + fix bugs ทุกอย่าง + verify battery runtime      | Field test + verify config A/B/C ในบ่อจริง + IP67 self-test ครั้งสุดท้าย      | ต้องทำพร้อมกัน  |

### Phase 1 Done Criteria — ต้องผ่านทั้งหมดก่อนเริ่มทำ PCB

- Firmware ครบทุก function: sensor, MQTT, OTA, sleep, watchdog, buffer, safe mode
- Dashboard ครบ: real-time, GPS map, alert, interval config, LINE notification
- Enclosure กันน้ำผ่าน IP67 self-test (จุ่ม 1 เมตร 30 นาที board ไม่เสีย) — ทดสอบเองในบ่อ
- 3 configurations (ทุ่น / ไม้ปัก / ทุ่น+ไม้) ผ่านในบ่อจริง
- Battery runtime ผ่านขั้นต่ำ ≥ 12 วัน @ 5 นาที interval (stretch goal 14-16 วัน)
- ไม่มี critical bug ค้างอยู่

## Phase 2 — PCB Development (สัปดาห์ที่ 11-18)

> **หมายเหตุ:** เริ่มทำ PCB หลังจาก FS-HCore dev board ผ่านครบทุก function ใน Phase 1 แล้วเท่านั้น — PCB v1→v2→v3 รวมสูงสุด 3 version ครั้งละ 10 ชิ้น ~500 THB — IP67 ทดสอบเองในบ่อจริง ไม่ส่งห้องแล็บในขั้นนี้ — พร้อมเตรียมเอกสาร/ยื่น กสทช. ช่วงปลาย Phase 2 — งบ ~4,000 THB

| สัปดาห์ | พล (Server + Firmware)                                      | เอ (Hardware + Design)                                       | Dependency        |
| ------- | ----------------------------------------------------------- | ------------------------------------------------------------ | ----------------- |
| 11-12   | Port firmware จาก FS-HCore ไป PCB v1 + ปรับ pin assignment  | ออกแบบ PCB v1 ใน KiCad — รวมทุก component + power management | เอออกแบบก่อน พลรอ |
| 12-13   | ทดสอบ firmware บน PCB v1 ทุก pin + identify issues          | สั่ง PCB v1 JLCPCB (10 ชิ้น ~500 THB) + ประกอบ + ตรวจ solder | รอ PCB ~7 วัน     |
| 13-14   | Fix firmware issues จาก PCB v1                              | แก้ schematic PCB v2 + สั่ง JLCPCB (10 ชิ้น ~500 THB)        | รอผล v1 ก่อน      |
| 14-15   | ทดสอบ firmware PCB v2 ครบทุก function + verify = dev board  | ประกอบ PCB v2 + ใส่ enclosure + IP67 self-test ในบ่อจริง     | รอ PCB ~7 วัน     |
| 15-16   | ถ้า v2 ผ่าน → pilot-batch ready / ถ้าไม่ → PCB v3 (~500 THB) | PCB v3 ถ้าจำเป็น — ประกอบ + ทดสอบซ้ำ                         | ขึ้นกับผล v2      |
| 16-18   | เตรียม pilot firmware build + sign + documentation          | Assembly pilot batch 10 ชิ้น + QC ทุกเครื่อง                 | ทำ parallel ได้   |

### Phase 2 Done Criteria

- PCB final ทำงานได้ครบทุก function เหมือน FS-HCore dev board
- ประกอบในกล่อง IP67 ได้ + waterproof self-test ผ่านในบ่อจริง
- Pilot batch 10 ชิ้น QC ผ่านทั้งหมด
- กสทช. application ยื่นแล้ว

## Phase 3 — Pilot & Launch Readiness (สัปดาห์ที่ 19-26)

> **หมายเหตุ:** เป้าหมาย Phase 3: รัน pilot 30 วัน + ปิด launch checklist + เก็บ waitlist ลูกค้าที่พร้อมซื้อหลัง commercial launch — งบ ~4,300 THB (PCB batch 10 ชิ้น + 3D print ASA 2 ชิ้นวางแสดง + misc) — ไม่รวม กสทช. และ marketing

| สัปดาห์ | พล (Server + Firmware)                                                 | เอ (Hardware + Design)                             | Dependency        |
| ------- | ---------------------------------------------------------------------- | -------------------------------------------------- | ----------------- |
| 19-20   | LINE Messaging API + subscription system + landing page + payment flow | 3D Print จากร้าน ASA 2 ชิ้น (วางแสดง) + QC         | 3D print ~3-5 วัน |
| 20-21   | Payment flow test end-to-end + user management + provisioning flow     | Pilot installation กับลูกค้าในฟาร์ม + เก็บ feedback | ต้องทำพร้อมกัน    |
| 21-22   | Fix bugs จาก pilot + optimize + db index tuning                        | คู่มือภาษาไทย (ภาพ + วิดีโอสั้น)                    | รอ feedback       |
| 23-26   | Launch readiness + monitoring + waitlist conversion prep               | สรุปผล pilot + เตรียม batch ถัดไป                   | Commercial launch รอ กสทช. |

### Phase 3 Done Criteria

- มี pilot farms ใช้งานจริงอย่างน้อย 3 farms
- มี waitlist / pipeline พร้อมซื้อหลัง commercial launch อย่างน้อย 10 farms
- Customer satisfaction > 4/5 จาก pilot users
- กสทช. อยู่ในกระบวนการหรือยื่นแล้ว — commercial launch ทำหลัง approval

## Phase 4 — Scale (Nov 2026 onwards, priority order)

| Priority | Feature                     | ผู้รับผิดชอบ | Timeline ประมาณ               | เหตุผล                                      |
| -------- | --------------------------- | ------------ | ----------------------------- | ------------------------------------------- |
| P1       | PWA / mobile optimization   | พล           | Nov-Dec 2026 (1 เดือน)        | ลูกค้าใช้มือถือ — ต้องดีก่อน app            |
| P1       | เพิ่ม sensor: pH + DO       | เอ + พล      | Nov 2026 - Jan 2027 (2 เดือน) | ลูกค้าขอบ่อย — revenue เพิ่มทันที           |
| P2       | Solar panel option          | เอ           | Jan-Feb 2027 (1 เดือน)        | ลด friction ชาร์จแบต — เพิ่ม retention      |
| P2       | AI/ML anomaly detection     | พล           | Mar-May 2027 (3 เดือน)        | ต้องมีข้อมูลสะสม ~6 เดือนก่อน               |
| P3       | SB-01 (fixed version)       | ทั้งคู่      | Q2 2027 (3-4 เดือน)           | product variant ใหม่ — ลูกค้า fixed install |
| P3       | AC-00 (actuator controller) | เอ + พล      | Q3 2027 (4-6 เดือน)           | product line ใหม่ — ใหญ่มาก ต้องวางแผนแยก   |
| P4       | LoRaWAN gateway option      | เอ + พล      | Q4 2027+                      | สำหรับ farm ขนาดใหญ่หลาย zone               |
| P4       | Mobile app (React Native)   | พล           | Q4 2027+ (ถ้า PWA ไม่พอ)      | ทำเมื่อ PWA มี limitation จริงๆ             |

## 10.x Risk Assessment — 2 คน

| ความเสี่ยง                   | โอกาส            | ผลกระทบ                                 | Mitigation                                  |
| ---------------------------- | ---------------- | --------------------------------------- | ------------------------------------------- |
| คนใดคนหนึ่งป่วย/ติดงาน       | สูง              | Phase ช้า 1-2 สัปดาห์                   | document งานดี + cross-train เบื้องต้น      |
| PCB revision เพิ่ม (แก้ bug) | กลาง             | Phase 2 ช้า 2-3 สัปดาห์ + ค่า PCB เพิ่ม | ทำ schematic review ละเอียดก่อนสั่ง         |
| กสทช. ล่าช้า                 | ต่ำ (อยู่ระหว่างยื่น) | ไม่กระทบ pilot — แต่บล็อก commercial launch | ทำ pilot / เก็บ waitlist ระหว่างรอ approval |
| Firmware bug ใน field        | กลาง             | ต้อง recall หรือ OTA fix                | Field test 1 เดือนก่อน launch               |
| Component shortage (chip)    | ต่ำ-กลาง         | production delay                        | สั่ง component สำรองล่วงหน้า 3 เดือน        |
| ลูกค้า beta feedback เยอะมาก | กลาง             | scope creep — Phase 3 ช้า               | prioritize feedback ตาม impact/effort       |
| ทีม 2 คน burn out            | กลาง             | quality ลด / เลิกกลางคัน                | กำหนด working hours + milestone celebration |

# 20. Regulatory & Certification

## 20.1 กสทช. (ประเทศไทย)

อุปกรณ์ IoT ที่ใช้คลื่นความถี่วิทยุ (4G, BLE) ต้องได้รับการรับรองจาก กสทช. ก่อนจำหน่ายในไทย

| รายการ                | รายละเอียด                                              | ค่าใช้จ่าย                                       |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| กสทช. Type Approval   | อุปกรณ์วิทยุคมนาคม (4G module)                          | ~15,000 THB                                      |
| IP67 Testing          | self-test ก่อน (section 26.9) → ห้องแล็บเมื่อยื่น กสทช. | ~10,000 THB (ห้องแล็บ) — ยังไม่รวมในงบ Phase 1-3 |
| CE Marking (optional) | ถ้าจะ export ไปยุโรปในอนาคต                             | 50,000+ THB                                      |
| รวม (ไทย)             |                                                         | ~25,000 THB                                      |

> **หมายเหตุ:** SIMCom A7670E มี FCC/CE certification อยู่แล้ว — ช่วยลดขั้นตอนการขอ กสทช. ได้บางส่วน

## 20.2 Timeline

| ขั้นตอน                               | ระยะเวลา                | หมายเหตุ                                            |
| ------------------------------------- | ----------------------- | --------------------------------------------------- |
| เตรียมเอกสาร (schematic, BOM, manual) | 2-4 สัปดาห์             |                                                     |
| ยื่นขอ กสทช.                          | 4-8 สัปดาห์             | ทำพร้อม Phase 3                                     |
| IP67 Lab Testing                      | 1-2 สัปดาห์             | ห้องแล็บในไทย — ทำเมื่อยื่น กสทช. และต้องเสร็จก่อน commercial launch |
| รับใบรับรอง                           | 1-2 สัปดาห์หลัง approve |                                                     |
| รวม                                   | 8-16 สัปดาห์            | เริ่มยื่นตั้งแต่ Phase 2                            |

- ควรยื่นขอ กสทช. ตั้งแต่ Phase 2 เพราะใช้เวลานาน
- ระหว่างรอ certification ทำ beta testing กับลูกค้าได้ (ไม่ได้จำหน่าย)
