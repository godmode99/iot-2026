# SB-00 — Development Plan Summary

**Version 1.1 | March 2026 | ใช้ประกอบกับ SB-00_Business_Roadmap_v1_1.md**

> **Reference baseline:** เอกสารนี้อ้างอิงสมมติฐานกลางใน [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md) | **Last synced:** 2026-04-02

---

## ทีม & Dev Board

| คน  | รับผิดชอบหลัก                                                                                | Dev Board                                                                     |
| --- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| พล  | Firmware (ESP-IDF), Backend (Vercel/Supabase), Dashboard (Next.js), MQTT, OTA                | ESP32-S3 DevKit (ไม่มี 4G) — ทดสอบ firmware logic บน breadboard ไม่ต้องบัดกรี |
| เอ  | PCB (KiCad), Enclosure 3D (Fusion 360), Assembly, Waterproof, 3D Print, **งานบัดกรีทั้งหมด** | FS-HCore-A7670C — hardware ครบ พร้อม sensor ประกอบจริง                        |

---

## พล — DevKit Workflow (ไม่ต้องบัดกรี)

> พลใช้ breadboard + jumper wire ทั้งหมด — เอรับผิดชอบงานบัดกรีและ assembly ทุกอย่าง

| ทดสอบบน ESP32-S3 DevKit ได้เลย      | ต้องใช้ FS-HCore (มี 4G) | ต้อง Sync กับเอก่อน          |
| ----------------------------------- | ------------------------ | ---------------------------- |
| DS18B20 OneWire read                | AT command SIM7670C      | Pin assignment confirm       |
| SEN0600 RS485 Modbus RTU (Phase 2+) | MQTT over 4G TLS         | Enclosure size + cable gland |
| GPS L76K NMEA parse                 | PSM mode + current drain | Power test ร่วมกัน           |
| MAX17048 I2C fuel gauge             | NTP sync ผ่าน 4G         | Field test (ไปด้วยกัน)       |
| Deep sleep + RTC wakeup             | Buffer flush ผ่าน 4G     | IP67 test ร่วมกัน            |
| NVS read/write + config             | OTA ผ่าน HTTPS 4G        | Figma review                 |
| FreeRTOS tasks + watchdog           | SIM operator comparison  | PCB bug list                 |
| Dashboard API (mock data)           |                          |                              |

---

## Phase 1 — Two Parallel Test Sets

|               | พล                                                 | เอ                                                       |
| ------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Board         | ESP32-S3 DevKit (ไม่มี 4G)                         | FS-HCore-A7670C (มี 4G)                                  |
| การทดสอบ      | Firmware logic, backend, dashboard — บน breadboard | Hardware จริง — sensor ประกอบ, enclosure, waterproof, 4G |
| บัดกรี        | ❌ ไม่ต้อง                                         | ✓ เอทำทั้งหมด                                            |
| Sensor ที่ใช้ | DS18B20 ×1 + Analog Turbidity ×1 (ต่อ breadboard)  | DS18B20 ×1 + Analog Turbidity ×1 (ประกอบจริง)            |
| ข้อดี         | ทำ parallel ได้ทันที ไม่รอกัน                      |                                                          |

## Milestone Dates (เริ่ม April 2026)

| Phase                                      | ช่วงเวลา       | สัปดาห์ | งบ                                   | เป้าหมาย                                               |
| ------------------------------------------ | -------------- | ------- | ------------------------------------ | ------------------------------------------------------ |
| Phase 1 — Prototype & Full Test            | Apr - Jun 2026 | 1-10    | ~20,400 THB (พล ~4,400 / เอ ~16,000) | ทุก function ผ่าน + engineering field test 7 วัน       |
| Phase 2 — PCB Development                  | Jun - Aug 2026 | 11-18   | ~4,000 THB                           | PCB pilot-batch ready + batch 10 ชิ้น + ยื่น กสทช.     |
| Phase 3 — Pilot & Launch Readiness         | Sep - Oct 2026 | 19-26   | ~4,300 THB                           | pilot 30 วัน + launch checklist ครบ + pipeline 10 farms |

### Phase 1 — สัปดาห์ละเอียด

| สัปดาห์ | วันที่               | เป้าหมาย                            |
| ------- | -------------------- | ----------------------------------- |
| 1-2     | 1-14 Apr 2026        | อ่านค่า sensor ได้ครั้งแรก          |
| 3-4     | 15-28 Apr 2026       | MQTT ขึ้น cloud + enclosure v1      |
| 5-6     | 29 Apr - 12 May 2026 | Dashboard live + waterproof test    |
| 7-8     | 13-26 May 2026       | OTA + alert + Figma review          |
| 9-10    | 27 May - 9 Jun 2026  | Engineering field test 7 วัน ✓ Phase 1 Complete |

### Phase 2 — สัปดาห์ละเอียด

| สัปดาห์ | วันที่               | เป้าหมาย                                    |
| ------- | -------------------- | ------------------------------------------- |
| 11-12   | 10-23 Jun 2026       | PCB v1 design + สั่ง JLCPCB                 |
| 12-13   | 24 Jun - 7 Jul 2026  | PCB v1 assembly + test                      |
| 13-15   | 8-28 Jul 2026        | PCB v2 + IP67 final                         |
| 16-18   | 29 Jul - 18 Aug 2026 | Pilot batch 10 ชิ้น ✓ Phase 2 Complete      |

### Phase 3 — สัปดาห์ละเอียด

| สัปดาห์ | วันที่              | เป้าหมาย                                        |
| ------- | ------------------- | ----------------------------------------------- |
| 19-20   | 1-14 Sep 2026       | Landing page + payment flow + assembly          |
| 20-22   | 15 Sep - 5 Oct 2026 | Pilot / beta validation กับลูกค้า 30 วัน        |
| 23-26   | 6-31 Oct 2026       | Launch readiness + waitlist 10 farms ✓ Phase 3 Complete |

---

## Dependency Map — งานไหนรอใคร

| งาน                        | รอ                        | ผู้รอ         | วิธี Unblock                               |
| -------------------------- | ------------------------- | ------------- | ------------------------------------------ |
| Port firmware ไป PCB       | Pin assignment จาก KiCad  | พล รอ เอ      | เอส่ง schematic PDF + pin map ก่อนสั่ง PCB |
| ทดสอบ MQTT บน hardware     | FS-HCore + SIM activate   | พล รอ เอ      | เอเตรียม FS-HCore + ซื้อ SIM ล่วงหน้า      |
| PCB v2 schematic           | Bug list จากทดสอบ PCB v1  | เอ รอ พล      | พลส่ง bug list ใน GitHub Issues ทันที      |
| Production firmware build  | PCB final ผ่าน QC         | พล รอ เอ      | เอส่ง PCB ที่ผ่าน QC ให้พลทดสอบ            |
| QC Checklist firmware test | Firmware binary จากพล     | เอ รอ พล      | พลส่ง binary + flash guide ก่อน QC         |
| Beta installation          | Production units พร้อม    | ทั้งคู่ รอ เอ | เอ assembly ล่วงหน้า 1 สัปดาห์             |
| Dashboard go-live          | Payment gateway test ผ่าน | ลูกค้า รอ พล  | พล end-to-end test ก่อน launch 1 สัปดาห์   |
| Figma handoff              | Design จากเอ              | พล รอ เอ      | เอส่ง Figma link → พล implement            |

### Critical Path

```
อ่าน sensor → MQTT cloud → Dashboard → Engineering Field Test → PCB v1 → PCB v2 → Production → Pilot → Commercial Launch
```

ถ้าขั้นตอนใดช้า 1 สัปดาห์ → ทุกอย่างหลังจากนั้นช้าตาม

---

## Phase 1 — Definition of Done (ต้องผ่านก่อนเริ่ม Phase 2)

1. อ่านค่า DS18B20 accuracy ±0.5°C
2. Analog turbidity sensor อ่านค่าได้ถูกต้อง pipeline ส่งถึง dashboard
3. GPS warm start fix < 20 วินาที
4. MQTT publish ผ่าน 4G TLS สำเร็จ
5. Dashboard real-time + GPS map แสดงได้
6. Deep sleep + wakeup ทำงาน 24 ชม. ไม่ crash
7. Battery runtime ≥ 12 วัน @ 5 นาที interval (stretch goal 14-16 วัน)
8. OTA update จาก dashboard สำเร็จ
9. LINE alert ทำงานได้
10. IP67 self-test ผ่าน (จุ่ม 1m 30 นาที แห้ง)
11. 3 configurations (ทุ่น/ไม้/ทุ่น+ไม้) ผ่านในบ่อจริง
12. ไม่มี critical bug ค้างใน GitHub Issues

## Phase 2 — Definition of Done

1. PCB final ทำงานเหมือน FS-HCore ทุก function
2. Test points TP1-TP6 ได้ค่าตาม spec
3. IP67 self-test ผ่านใน enclosure จริง
4. Production firmware + Flash Encryption build สำเร็จ
5. Pilot batch 10 ชิ้น QC ผ่านทั้งหมด
6. กสทช. application ยื่นแล้ว

## Phase 3 — Definition of Done

1. มี pilot farms ใช้งานจริงอย่างน้อย 3 farms
2. มี waitlist / pipeline พร้อมซื้อหลัง commercial launch ≥ 10 farms
3. Customer satisfaction > 4/5 จาก pilot users
4. Zero critical bugs 7 วัน (Sentry)
5. OTA deploy ได้โดยไม่ downtime
6. Dashboard ใช้ได้บน mobile
7. ลูกค้าติดตั้งเองได้จากคู่มือ
8. Support response < 24 ชม.
9. Commercial launch จะทำหลัง กสทช. อนุมัติเท่านั้น

---

## Risk Scenarios

| สถานการณ์                                     | แนวทาง                                                    |
| --------------------------------------------- | --------------------------------------------------------- |
| PCB JLCPCB ส่งช้า +1-2 สัปดาห์                | พลทำ firmware + backend บน DevKit ต่อ ไม่หยุด             |
| Component out of stock                        | เช็ค stock ก่อนสั่ง 2 สัปดาห์ มี LCSC backup part         |
| PCB v1 bug เยอะ → ต้อง v3                     | ยอมรับได้ v3 = +500 THB งบยังพอ                           |
| Analog turbidity sensor ไม่ทำงานที่ VBAT 3.7V | ใช้ MT3608 step-up 5V มีอยู่แล้วใน procurement            |
| กสทช. ล่าช้า                                  | ไม่บล็อก pilot — แต่บล็อก commercial launch                |
| Burn out ทีม 2 คน                             | Weekly sync + milestone celebration + กำหนด working hours |

---

## Weekly Sync Agenda (~15-25 นาที)

1. What did we do? (5 นาที)
2. What's blocking? (5 นาที)
3. What's next? (5 นาที)
4. Sync items ที่ต้องตัดสินใจร่วมกัน (10 นาที ถ้ามี)

**Communication:** GitHub Issues (tasks) · LINE/Discord (daily) · Claude Project (reference) · Figma (UI design)
