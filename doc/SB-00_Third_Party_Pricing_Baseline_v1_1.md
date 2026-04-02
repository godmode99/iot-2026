# SB-00 — Third-Party Pricing Baseline

**Version 1.1 | April 2026 | Canonical service pricing/limits baseline for SB-00 v1.1 | Last synced: 2026-04-02**

> **Reference baseline:** ใช้คู่กับ [SB-00_Master_Assumptions_v1_1.md](./SB-00_Master_Assumptions_v1_1.md)
>
> **Important:** คอลัมน์ `Verified on` ในเอกสารนี้หมายถึงวันที่ sync สมมติฐานเอกสาร (`planning sync`) ไม่ใช่ live vendor quote
>
> ก่อน `commercial launch` ต้อง re-check vendor pricing/quota จริงอีกครั้ง โดยเฉพาะ services ที่ราคาและแพ็กเกจเปลี่ยนได้ง่าย

---

## Canonical Table

| Service | ใช้สำหรับ | Free tier / included | Upgrade trigger | Canonical planning estimate | Verified on | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| HiveMQ Cloud | MQTT broker | 100 connections | > 100 devices | Standard ~$25/mo (~900 THB/mo) | 2026-04-02 (planning sync) | ใช้เป็น broker หลัก |
| Supabase | DB + auth + realtime fallback | 500MB DB, 50k rows/day | ~60+ devices / DB โตเกิน free tier | Pro $25/mo (~900 THB/mo) | 2026-04-02 (planning sync) | planning estimate |
| Upstash Redis | cache, rate limit, pub-sub assist | 10,000 req/day | ~17+ devices | Pay-per-use ~$5/mo | 2026-04-02 (planning sync) | planning estimate |
| Upstash QStash | queue / retry / webhook buffer | 500 msg/day | 2 active devices ใน Phase 1 dev/test หรือ usage > 500 msg/day | Pay-per-use ~$4/mo (~144 THB/mo) | 2026-04-02 (planning sync) | ใช้จ่ายตั้งแต่ช่วง parallel dev/test |
| Vercel Hobby/Pro | hosting / serverless | Hobby free | ~50+ devices หรือเมื่อ hobby tier ไม่พอ | Pro $20/mo (~720 THB/mo) | 2026-04-02 (planning sync) | planning estimate |
| LINE Messaging API / LINE OA | push alerts ผ่าน LINE | Free tier 200 msg/mo | > 200 msg/mo (~40+ devices ถ้ามี alert บ่อย) | Paid plan ~150 THB/mo (planning estimate) | 2026-04-02 (planning sync) | ต้อง re-check plan/quota จริงก่อน commercial launch |
| Resend | email alerts / reports | 3,000 emails/mo | ~88+ devices | Starter $20/mo (~720 THB/mo) | 2026-04-02 (planning sync) | planning estimate |
| Sentry | error monitoring | 5,000 errors/mo | ~500+ devices | Team $26/mo (~936 THB/mo) | 2026-04-02 (planning sync) | planning estimate |
| Stripe | global SaaS billing | no setup fee | เมื่อมี paid global customers | 3.65% / transaction | 2026-04-02 (planning sync) | transaction basis |
| Omise | Thai billing / PromptPay | no setup fee | เมื่อมี paid Thai customers | 3.65% / transaction | 2026-04-02 (planning sync) | transaction basis |

## Usage Rules

- ถ้ามีตัวเลข price/limit ของ service ข้างต้นปรากฏในเอกสารอื่น ให้ยึดไฟล์นี้เป็นตัวกลางก่อน
- ถ้าเอกสารอื่นต้องพูดถึง service เดิมซ้ำ ให้ใช้ wording เดียวกับ column `Canonical planning estimate`
- ถ้าทีม re-check vendor จริงแล้ว ให้ update ไฟล์นี้ก่อน แล้วค่อย sync [SB-00_Backend_Security_v1_1.md](./SB-00_Backend_Security_v1_1.md) และ [SB-00_Procurement_List_v1_1.md](./SB-00_Procurement_List_v1_1.md)
