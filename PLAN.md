# SBAC Compiler — แผนการทำงาน

เว็บเขียนและรัน SQL ออนไลน์ หน้าตาและการใช้งานแบบ OneCompiler (SQL Server) แต่ต่อยอดด้วย
**แม่แบบ (Templates)**, **บทเรียน (Tutorial)**, **หน้าตาราง (Tables)** และ **แบบฝึกหัด (Exercises)**

---

## 1. เป้าหมาย

| # | ความต้องการ | วิธีทำ |
|---|---|---|
| 1 | หน้า Compiler แบบ OneCompiler (แถบบน, ไฟล์หลายแท็บ, I/O ด้านขวา) | หน้า `#/editor` |
| 2 | **มีหลายแท็บ → กด Run แล้วรันโค้ดของแท็บที่เปิดอยู่** ไม่ใช่แท็บแรก | ปุ่ม Run ผูกกับ `activeFileId` และแสดงชื่อไฟล์บนปุ่ม (`Run · init.sql`) |
| 3 | แม่แบบ (Templates) | หน้า `#/templates` เลือกแล้วโหลด `init.sql` + `queries.sql` เข้า Editor |
| 4 | ระบบบทเรียน (Tutorial) | หน้า `#/tutorial` บทเรียนภาษาไทย + mini editor รันได้ในหน้า + ติดตามความคืบหน้า |
| 5 | หน้าตาราง (Table) | หน้า `#/tables` ดูตารางทั้งหมดในฐานข้อมูลปัจจุบัน (ข้อมูล/โครงสร้าง/นำเข้า-ส่งออก CSV) |
| 6 | แบบฝึกหัด (Exercises) | หน้า `#/exercises` โจทย์ + ตรวจคำตอบอัตโนมัติ + คำใบ้ + เฉลย |

## 2. สถาปัตยกรรม (เฟส 1 — ทำงานในเบราว์เซอร์ล้วน ไม่ต้องมีเซิร์ฟเวอร์)

```
sbac-compiler/
├── index.html          โครงหน้า + โหลดสคริปต์ (CodeMirror, sql.js จาก cdnjs)
├── css/app.css         ธีมสว่าง/มืด, layout ทุกหน้า
└── js/
    ├── util.js         helper: DOM, toast, modal, ตารางผลลัพธ์, CSV
    ├── store.js        บันทึกลง localStorage (workspace, โปรเจกต์, ความคืบหน้า, ประวัติ)
    ├── dialects.js     แปลง T-SQL / MySQL → SQLite (IDENTITY, TOP, GO, N'..', PRINT, + ต่อสตริง ฯลฯ)
    ├── engine.js       ตัวรัน SQL (sql.js / WASM), แยก batch, นับ rows affected, ฟังก์ชัน T-SQL เพิ่ม
    ├── data/templates.js   ข้อมูลแม่แบบ
    ├── data/lessons.js     เนื้อหาบทเรียน
    ├── data/exercises.js   โจทย์แบบฝึกหัด + เฉลย
    ├── pages/editor.js     หน้า Compiler
    ├── pages/templates.js  หน้าแม่แบบ
    ├── pages/tutorial.js   หน้าบทเรียน
    ├── pages/tables.js     หน้าตาราง
    ├── pages/exercises.js  หน้าแบบฝึกหัด
    └── app.js          router (#/...), แถบนำทาง, ธีม
```

- **SQL engine**: SQLite (sql.js WASM) + ชั้นแปลภาษา (dialect layer) ให้เขียนแบบ SQL Server / MySQL ได้
  - SQL Server: `IDENTITY(1,1)`, `GO`, `TOP n`, `N'ข้อความ'`, `PRINT`, `GETDATE()`, `LEN()`, `ISNULL()`, `LEFT/RIGHT`,
    `CHARINDEX`, `DATEDIFF`, `DATEADD`, `YEAR/MONTH/DAY`, `OFFSET … FETCH`, `VARCHAR(MAX)`, `dbo.`, ต่อสตริงด้วย `+`,
    คำสั่งที่ไม่มี `;` คั่น
  - MySQL: `AUTO_INCREMENT`, `ENGINE=…`, `NOW()`, `SHOW TABLES`, `DESCRIBE`
- **ฐานข้อมูลต่อ workspace**: รันแท็บไหนก็ทำงานกับฐานข้อมูลเดียวกัน (รัน `init.sql` สร้างตาราง → สลับไป `queries.sql` แล้ว query ได้)
  มีปุ่ม **Reset DB** และ **Run ทุกแท็บตามลำดับ**
- **บันทึก**: autosave ไฟล์ + snapshot ฐานข้อมูลลง localStorage, ปุ่ม Save เป็นโปรเจกต์, ปุ่ม Share สร้างลิงก์ที่ฝังโค้ด

## 3. ลำดับงาน

1. **โครงเว็บ** — index.html, ธีมสว่าง/มืด, แถบบนแบบ OneCompiler, router 5 หน้า
2. **SQL engine** — sql.js, แยก batch ด้วย `GO`, แยก statement, ผลลัพธ์หลายชุด, `(n rows affected)`, error พร้อมบรรทัด
3. **หน้า Compiler** — แท็บไฟล์ (เพิ่ม/เปลี่ยนชื่อ/ปิด/สลับ), **Run = แท็บที่เปิด**, รันเฉพาะส่วนที่เลือก,
   Ctrl+Enter, STDIN/Output, ประวัติการรัน, โปรเจกต์ที่บันทึก, Share
4. **แม่แบบ** — Customers/Orders/Shippings, Continents, โรงเรียน, ร้านค้า, พนักงาน, ห้องสมุด, ว่างเปล่า
5. **หน้าตาราง** — ภาพรวมทุกตาราง (การ์ดแบบรูปตัวอย่าง), ดูข้อมูล/โครงสร้าง/Foreign key, ค้นหา, CSV เข้า-ออก
6. **บทเรียน** — 6 หมวด ~14 บท: SELECT → WHERE → ORDER BY/TOP → ฟังก์ชันรวม → GROUP BY → JOIN → DML → DDL → Subquery
   แต่ละบทมีคำอธิบาย, ไวยากรณ์, ตัวอย่างที่กดรันได้, โจทย์ท้ายบท, ปุ่มเปิดใน Compiler
7. **แบบฝึกหัด** — ~20 ข้อ แบ่งระดับ ง่าย/กลาง/ยาก, ตรวจโดยเทียบผลลัพธ์กับเฉลย (รันบนฐานข้อมูลใหม่ทุกครั้ง)
8. **ทดสอบ** — รันในเบราว์เซอร์, ทดสอบเคสหลายแท็บ, ทดสอบโจทย์ทุกข้อด้วยเฉลยของตัวเองต้องผ่าน

## 4. เฟสถัดไป (ต่อยอด)

| เฟส | งาน |
|---|---|
| 2 | Backend รัน **SQL Server จริง** (Docker `mssql/server`) + MySQL/PostgreSQL จริง ผ่าน API, sandbox ต่อผู้ใช้, จำกัดเวลา/แถว |
| 3 | บัญชีผู้ใช้ (Login), บันทึกโปรเจกต์บนคลาวด์, ลิงก์แชร์แบบสั้น |
| 4 | โหมดห้องเรียน: ครูสร้างโจทย์/ชุดแบบฝึก, ส่งงาน, คะแนน, dashboard ความคืบหน้านักเรียน |
| 5 | AI ช่วยอธิบาย error / ใบ้คำตอบ, ER diagram อัตโนมัติจาก Foreign key |

## 5. วิธีรัน

เปิดไฟล์ `index.html` ได้เลย หรือรันเซิร์ฟเวอร์:

```bash
npx serve -l 5173 .
```

แล้วเปิด http://localhost:5173 (ต้องต่ออินเทอร์เน็ตครั้งแรกเพื่อโหลด CodeMirror และ sql.js จาก cdnjs)
