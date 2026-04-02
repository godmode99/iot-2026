# Documentation Structure

โฟลเดอร์ `doc/` ถูกแยกเป็น 2 ชุด:

- `doc/ai/`
  - source of truth สำหรับ AI assistants เช่น Codex, Claude
  - ใช้ไฟล์ Markdown ที่อ้างอิงกันชัด อ่านง่าย และเหมาะกับ diff/review
  - มีทั้ง baseline docs, decision register, pricing baseline, และ execution task list
- `doc/human/`
  - เอกสาร `.docx` สำหรับคนอ่าน
  - สร้างจากชุด `doc/ai/` เพื่อให้รูปแบบอ่านง่ายขึ้นใน Word
  - มีไฟล์ index กลางคือ `SB-00_Document_Index_v1_1.docx`

## Workflow

1. แก้ไขเอกสารต้นฉบับใน `doc/ai/`
2. รัน `python scripts/build_human_docs.py`
3. เปิด `doc/human/SB-00_Document_Index_v1_1.docx` เพื่อเริ่มอ่านชุดเอกสาร
4. ถ้าต้องการ refresh สารบัญหรือเลขหน้า ให้เปิดไฟล์ใน Microsoft Word แล้วกด `Update Field`

## Notes

- ถ้ามีการปิด decision ใหม่ ให้ update `doc/ai/` ก่อนเสมอ
- ถ้ามีการปรับ pricing/limits ให้ update `doc/ai/SB-00_Third_Party_Pricing_Baseline_v1_1.md` ก่อน
- ตัว generator จะจัดหน้าปก สารบัญ และ footer เลขหน้าให้อัตโนมัติในชุด `doc/human/`
