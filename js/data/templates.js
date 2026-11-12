/* SBAC Compiler — starter templates & code snippets */
(function (S) {
  'use strict';
  const ds = S.datasets;

  S.templates = [
    {
      id: 'blank', title: 'ว่างเปล่า', color: '#868ba5', letter: '∅',
      desc: 'เริ่มจากศูนย์ มีไฟล์ queries.sql ไฟล์เดียว เหมาะกับการทดลองเขียนเอง',
      tags: ['เริ่มต้น'],
      files: [{ name: 'queries.sql', content: '-- เขียนคำสั่ง SQL ที่นี่ แล้วกด Run (Ctrl + Enter)\nSELECT \'Hello, SBAC Compiler!\' AS message;\n' }],
    },
    {
      id: 'shop', title: 'ร้านค้าออนไลน์', color: '#3f4fe0', letter: 'C',
      desc: 'ตาราง Customers, Orders, Shippings แบบเดียวกับตัวอย่างในบทเรียน — เหมาะฝึก SELECT, WHERE, JOIN',
      tags: ['Customers', 'Orders', 'Shippings'], dataset: 'shop',
      files: [
        { name: 'queries.sql', content: '-- รัน init.sql ก่อนหนึ่งครั้ง (หรือใช้แม่แบบนี้ ระบบรันให้แล้ว)\nSELECT * FROM Customers;\n\nSELECT c.first_name, o.item, o.amount\nFROM Customers c\nJOIN Orders o ON o.customer_id = c.customer_id;\n' },
        { name: 'init.sql', content: ds.shop.sql },
      ],
    },
    {
      id: 'continents', title: 'ทวีป (T-SQL IDENTITY)', color: '#d3355b', letter: 'W', dialect: 'tsql',
      desc: 'ตัวอย่างแบบ SQL Server: IDENTITY(1,1), GO และ INSERT หลายแถว — ตรงกับตัวอย่าง init.sql',
      tags: ['continents', 'IDENTITY', 'GO'], dataset: 'continents',
      files: [
        { name: 'queries.sql', content: 'SELECT * FROM continents;\n\nSELECT TOP 3 name FROM continents ORDER BY name;\n' },
        { name: 'init.sql', content: ds.continents.sql },
      ],
    },
    {
      id: 'school', title: 'โรงเรียน', color: '#36ad74', letter: 'S',
      desc: 'นักเรียน วิชา และคะแนน (ข้อมูลภาษาไทย) — ฝึก GROUP BY, AVG, JOIN 3 ตาราง',
      tags: ['Students', 'Subjects', 'Scores'], dataset: 'school',
      files: [
        { name: 'queries.sql', content: "-- คะแนนเฉลี่ยของแต่ละวิชา\nSELECT sj.subject_name, AVG(sc.score * 1.0) AS avg_score\nFROM Scores sc\nJOIN Subjects sj ON sj.subject_id = sc.subject_id\nGROUP BY sj.subject_name\nORDER BY avg_score DESC;\n" },
        { name: 'init.sql', content: ds.school.sql },
      ],
    },
    {
      id: 'store', title: 'ร้านสะดวกซื้อ', color: '#e08a1e', letter: 'P',
      desc: 'หมวดหมู่ สินค้า และยอดขายรายวัน — ฝึก SUM, HAVING, วันที่ และรายงานยอดขาย',
      tags: ['Categories', 'Products', 'Sales'], dataset: 'store',
      files: [
        { name: 'queries.sql', content: "-- สินค้าที่ใกล้หมด\nSELECT product_name, stock\nFROM Products\nWHERE stock < 30\nORDER BY stock;\n" },
        { name: 'init.sql', content: ds.store.sql },
      ],
    },
    {
      id: 'hr', title: 'บริษัท (HR)', color: '#7a3fc0', letter: 'H',
      desc: 'แผนกและพนักงาน มีหัวหน้างาน (self join) และพนักงานที่ยังไม่มีแผนก — ฝึก LEFT JOIN, Subquery',
      tags: ['Departments', 'Employees'], dataset: 'hr',
      files: [
        { name: 'queries.sql', content: "SELECT e.first_name, d.dept_name, e.salary\nFROM Employees e\nLEFT JOIN Departments d ON d.dept_id = e.dept_id\nORDER BY e.salary DESC;\n" },
        { name: 'init.sql', content: ds.hr.sql },
      ],
    },
    {
      id: 'library', title: 'ห้องสมุด', color: '#0f8fa8', letter: 'L',
      desc: 'หนังสือ สมาชิก และการยืม-คืน — ฝึกค่า NULL (ยังไม่คืน) และ DATEDIFF',
      tags: ['Books', 'Members', 'Loans'], dataset: 'library',
      files: [
        { name: 'queries.sql', content: "-- หนังสือที่ยังไม่ถูกคืน\nSELECT b.title, m.member_name, l.loan_date\nFROM Loans l\nJOIN Books b ON b.book_id = l.book_id\nJOIN Members m ON m.member_id = l.member_id\nWHERE l.return_date IS NULL;\n" },
        { name: 'init.sql', content: ds.library.sql },
      ],
    },
  ];

  S.snippets = [
    { id: 'select', title: 'SELECT พื้นฐาน', code: 'SELECT column1, column2\nFROM table_name\nWHERE condition\nORDER BY column1;\n' },
    { id: 'top', title: 'TOP / เรียงลำดับ', code: 'SELECT TOP 5 *\nFROM table_name\nORDER BY column1 DESC;\n' },
    { id: 'group', title: 'GROUP BY + HAVING', code: 'SELECT column1, COUNT(*) AS total\nFROM table_name\nGROUP BY column1\nHAVING COUNT(*) > 1;\n' },
    { id: 'inner', title: 'INNER JOIN', code: 'SELECT a.*, b.*\nFROM table_a a\nINNER JOIN table_b b ON b.a_id = a.id;\n' },
    { id: 'left', title: 'LEFT JOIN หาข้อมูลที่ไม่มีคู่', code: 'SELECT a.*\nFROM table_a a\nLEFT JOIN table_b b ON b.a_id = a.id\nWHERE b.a_id IS NULL;\n' },
    { id: 'create', title: 'CREATE TABLE + FOREIGN KEY', code: 'CREATE TABLE child_table (\n    id INT IDENTITY(1,1) PRIMARY KEY,\n    name NVARCHAR(100) NOT NULL,\n    parent_id INT FOREIGN KEY REFERENCES parent_table(id),\n    created_at DATETIME DEFAULT GETDATE()\n);\n' },
    { id: 'insert', title: 'INSERT หลายแถว', code: "INSERT INTO table_name (column1, column2) VALUES\n('value1', 1),\n('value2', 2);\n" },
    { id: 'update', title: 'UPDATE', code: "UPDATE table_name\nSET column1 = 'new value'\nWHERE id = 1;\n" },
    { id: 'delete', title: 'DELETE', code: 'DELETE FROM table_name\nWHERE id = 1;\n' },
    { id: 'case', title: 'CASE WHEN', code: "SELECT name,\n    CASE\n        WHEN score >= 80 THEN 'A'\n        WHEN score >= 70 THEN 'B'\n        ELSE 'C'\n    END AS grade\nFROM table_name;\n" },
    { id: 'cte', title: 'CTE (WITH)', code: 'WITH summary AS (\n    SELECT column1, SUM(column2) AS total\n    FROM table_name\n    GROUP BY column1\n)\nSELECT *\nFROM summary\nWHERE total > 100;\n' },
    { id: 'window', title: 'Window function (ROW_NUMBER)', code: 'SELECT *,\n    ROW_NUMBER() OVER (PARTITION BY column1 ORDER BY column2 DESC) AS rn\nFROM table_name;\n' },
    { id: 'view', title: 'CREATE VIEW', code: 'CREATE VIEW view_name AS\nSELECT column1, column2\nFROM table_name\nWHERE condition;\n' },
    { id: 'vars', title: 'ตัวแปร DECLARE / PRINT', code: "DECLARE @limit INT = 3;\nPRINT 'แสดง ' + CAST(@limit AS VARCHAR(10)) + ' แถวแรก';\nSELECT TOP (@limit) * FROM table_name;\n" },
  ];
})(window.SBAC);
