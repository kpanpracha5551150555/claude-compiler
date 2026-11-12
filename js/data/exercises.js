/* SBAC Compiler — exercises. Checked by comparing the result of your query with the solution's,
 * both run on a fresh copy of the dataset. `check` = query run after the code (for INSERT/UPDATE/CREATE tasks). */
(function (S) {
  'use strict';

  S.exerciseTopics = ['SELECT', 'WHERE', 'ORDER BY', 'ฟังก์ชันรวม', 'GROUP BY', 'JOIN', 'Subquery', 'จัดการข้อมูล', 'สร้างตาราง', 'วันที่'];

  S.exercises = [
    /* ---------------- ง่าย ---------------- */
    {
      id: 'e01', level: 'easy', topic: 'SELECT', dataset: 'shop', title: 'ชื่อ-นามสกุลลูกค้า',
      prompt: 'แสดงคอลัมน์ <code>first_name</code> และ <code>last_name</code> ของลูกค้าทุกคนจากตาราง <code>Customers</code>',
      hint: 'ใช้ SELECT ตามด้วยชื่อคอลัมน์คั่นด้วยจุลภาค',
      solution: 'SELECT first_name, last_name\nFROM Customers;',
    },
    {
      id: 'e02', level: 'easy', topic: 'WHERE', dataset: 'shop', title: 'ลูกค้าในสหราชอาณาจักร',
      prompt: 'แสดงข้อมูล <b>ทุกคอลัมน์</b> ของลูกค้าที่อยู่ประเทศ <code>UK</code>',
      hint: "ข้อความต้องอยู่ใน ' ' เช่น WHERE country = '...'",
      solution: "SELECT *\nFROM Customers\nWHERE country = 'UK';",
    },
    {
      id: 'e03', level: 'easy', topic: 'ORDER BY', dataset: 'shop', title: 'เรียงลูกค้าตามอายุ', ordered: true,
      prompt: 'แสดง <code>first_name</code> และ <code>age</code> ของลูกค้าที่อายุ <b>มากกว่า 22 ปี</b> เรียงตามอายุ <b>จากมากไปน้อย</b>',
      hint: 'WHERE age > 22 แล้ว ORDER BY age DESC',
      solution: 'SELECT first_name, age\nFROM Customers\nWHERE age > 22\nORDER BY age DESC;',
    },
    {
      id: 'e04', level: 'easy', topic: 'WHERE', dataset: 'store', title: 'สินค้าหมดสต็อก',
      prompt: 'แสดง <code>product_name</code> ของสินค้าที่ <b>หมดสต็อก</b> (<code>stock</code> เท่ากับ 0) จากตาราง <code>Products</code>',
      hint: 'WHERE stock = 0',
      solution: 'SELECT product_name\nFROM Products\nWHERE stock = 0;',
    },
    {
      id: 'e05', level: 'easy', topic: 'ORDER BY', dataset: 'store', title: 'สินค้าแพงที่สุด 3 อันดับ', ordered: true,
      prompt: 'แสดง <code>product_name</code> และ <code>price</code> ของสินค้าที่ <b>ราคาสูงที่สุด 3 อันดับแรก</b> เรียงจากแพงไปถูก',
      hint: 'SQL Server ใช้ SELECT TOP 3 … ORDER BY price DESC',
      solution: 'SELECT TOP 3 product_name, price\nFROM Products\nORDER BY price DESC;',
    },
    {
      id: 'e06', level: 'easy', topic: 'WHERE', dataset: 'school', title: 'นักเรียนหญิงชั้น ม.5',
      prompt: "แสดง <code>first_name</code>, <code>last_name</code> และ <code>class_room</code> ของนักเรียน <b>หญิง</b> ที่เรียนชั้น <b>ม.5</b> (ทุกห้อง)",
      hint: "ใช้ LIKE N'ม.5%' และ gender = N'หญิง'",
      solution: "SELECT first_name, last_name, class_room\nFROM Students\nWHERE gender = N'หญิง' AND class_room LIKE N'ม.5%';",
    },
    {
      id: 'e07', level: 'easy', topic: 'ฟังก์ชันรวม', dataset: 'hr', title: 'นับจำนวนพนักงาน',
      prompt: 'บริษัทมีพนักงานทั้งหมดกี่คน? แสดงผลเป็นคอลัมน์เดียว',
      hint: 'COUNT(*)',
      solution: 'SELECT COUNT(*) AS total_employees\nFROM Employees;',
    },
    {
      id: 'e08', level: 'easy', topic: 'ฟังก์ชันรวม', dataset: 'hr', title: 'เงินเดือนสูงสุด ต่ำสุด เฉลี่ย',
      prompt: 'แสดงเงินเดือน <b>สูงสุด</b>, <b>ต่ำสุด</b> และ <b>ค่าเฉลี่ย</b> ของพนักงานทั้งหมด (3 คอลัมน์ตามลำดับนี้)',
      hint: 'MAX, MIN, AVG — ค่าเฉลี่ยตรวจที่ทศนิยม 2 ตำแหน่ง',
      solution: 'SELECT MAX(salary) AS max_salary, MIN(salary) AS min_salary, AVG(salary * 1.0) AS avg_salary\nFROM Employees;',
    },

    /* ---------------- ปานกลาง ---------------- */
    {
      id: 'm01', level: 'medium', topic: 'JOIN', dataset: 'shop', title: 'ใครสั่งอะไร',
      prompt: 'แสดง <code>first_name</code> ของลูกค้า คู่กับ <code>item</code> และ <code>amount</code> ของคำสั่งซื้อทั้งหมด',
      hint: 'JOIN Orders ON Orders.customer_id = Customers.customer_id',
      solution: 'SELECT c.first_name, o.item, o.amount\nFROM Customers c\nJOIN Orders o ON o.customer_id = c.customer_id;',
    },
    {
      id: 'm02', level: 'medium', topic: 'JOIN', dataset: 'shop', title: 'ลูกค้าที่ยังไม่เคยซื้อ',
      prompt: 'แสดง <code>first_name</code> และ <code>last_name</code> ของลูกค้าที่ <b>ไม่เคยมีคำสั่งซื้อ</b>',
      hint: 'LEFT JOIN แล้วกรองแถวที่ฝั่ง Orders เป็น NULL',
      solution: 'SELECT c.first_name, c.last_name\nFROM Customers c\nLEFT JOIN Orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;',
    },
    {
      id: 'm03', level: 'medium', topic: 'GROUP BY', dataset: 'shop', title: 'ยอดซื้อรวมรายประเทศ', ordered: true,
      prompt: 'แสดง <code>country</code> และยอดรวม <code>amount</code> ของคำสั่งซื้อจากลูกค้าในแต่ละประเทศ (เฉพาะประเทศที่มีคำสั่งซื้อ) เรียงยอดรวม <b>จากมากไปน้อย</b>',
      hint: 'JOIN ก่อน แล้ว GROUP BY country และ ORDER BY SUM(amount) DESC',
      solution: 'SELECT c.country, SUM(o.amount) AS total\nFROM Customers c\nJOIN Orders o ON o.customer_id = c.customer_id\nGROUP BY c.country\nORDER BY total DESC;',
    },
    {
      id: 'm04', level: 'medium', topic: 'GROUP BY', dataset: 'store', title: 'จำนวนสินค้าในแต่ละหมวด',
      prompt: 'แสดง <code>category_name</code> และจำนวนสินค้าในหมวดนั้น — <b>ต้องแสดงทุกหมวด</b> แม้หมวดที่ยังไม่มีสินค้า (ให้นับเป็น 0)',
      hint: 'Categories LEFT JOIN Products แล้ว COUNT(p.product_id) (ไม่ใช่ COUNT(*))',
      solution: 'SELECT c.category_name, COUNT(p.product_id) AS products\nFROM Categories c\nLEFT JOIN Products p ON p.category_id = c.category_id\nGROUP BY c.category_name;',
    },
    {
      id: 'm05', level: 'medium', topic: 'GROUP BY', dataset: 'store', title: 'สินค้าขายดี (HAVING)',
      prompt: 'แสดง <code>product_name</code> และ <b>ยอดขายรวมเป็นเงิน</b> (<code>quantity × price</code>) ของสินค้าแต่ละตัว เฉพาะสินค้าที่ยอดขายรวม <b>มากกว่า 200 บาท</b>',
      hint: 'SUM(s.quantity * p.price) … GROUP BY … HAVING SUM(...) > 200',
      solution: 'SELECT p.product_name, SUM(s.quantity * p.price) AS revenue\nFROM Sales s\nJOIN Products p ON p.product_id = s.product_id\nGROUP BY p.product_name\nHAVING SUM(s.quantity * p.price) > 200;',
    },
    {
      id: 'm06', level: 'medium', topic: 'GROUP BY', dataset: 'school', title: 'คะแนนเฉลี่ยรายวิชา', ordered: true,
      prompt: 'แสดง <code>subject_name</code> และคะแนนเฉลี่ย (ทศนิยม) ของแต่ละวิชา เรียงจาก <b>คะแนนเฉลี่ยมากไปน้อย</b>',
      hint: 'AVG(score * 1.0) เพื่อให้ได้ทศนิยม, JOIN Subjects เพื่อเอาชื่อวิชา',
      solution: 'SELECT sj.subject_name, AVG(sc.score * 1.0) AS avg_score\nFROM Scores sc\nJOIN Subjects sj ON sj.subject_id = sc.subject_id\nGROUP BY sj.subject_name\nORDER BY avg_score DESC;',
    },
    {
      id: 'm07', level: 'medium', topic: 'JOIN', dataset: 'hr', title: 'แผนกที่ไม่มีพนักงาน',
      prompt: 'แสดง <code>dept_name</code> ของแผนกที่ <b>ยังไม่มีพนักงานเลย</b>',
      hint: 'Departments LEFT JOIN Employees … WHERE e.emp_id IS NULL',
      solution: 'SELECT d.dept_name\nFROM Departments d\nLEFT JOIN Employees e ON e.dept_id = d.dept_id\nWHERE e.emp_id IS NULL;',
    },
    {
      id: 'm08', level: 'medium', topic: 'Subquery', dataset: 'hr', title: 'เงินเดือนสูงกว่าค่าเฉลี่ย',
      prompt: 'แสดง <code>first_name</code> และ <code>salary</code> ของพนักงานที่เงินเดือน <b>สูงกว่าค่าเฉลี่ย</b> ของทั้งบริษัท',
      hint: 'WHERE salary > (SELECT AVG(salary) FROM Employees)',
      solution: 'SELECT first_name, salary\nFROM Employees\nWHERE salary > (SELECT AVG(salary * 1.0) FROM Employees);',
    },
    {
      id: 'm09', level: 'medium', topic: 'จัดการข้อมูล', dataset: 'shop', title: 'ปรับราคาคีย์บอร์ด',
      prompt: "ร้านขึ้นราคาสินค้า <code>Keyboard</code> ทุกคำสั่งซื้อเป็น <b>450</b> และยกเลิก (ลบ) คำสั่งซื้อ <code>Mousepad</code> — เขียนคำสั่ง UPDATE และ DELETE",
      hint: "UPDATE Orders SET amount = 450 WHERE item = 'Keyboard'; แล้ว DELETE …",
      solution: "UPDATE Orders SET amount = 450 WHERE item = 'Keyboard';\nDELETE FROM Orders WHERE item = 'Mousepad';",
      check: 'SELECT * FROM Orders ORDER BY order_id;',
    },
    {
      id: 'm10', level: 'medium', topic: 'วันที่', dataset: 'library', title: 'หนังสือที่ยังไม่คืน',
      prompt: 'แสดง <code>title</code> ของหนังสือและ <code>member_name</code> ของผู้ยืม สำหรับการยืมที่ <b>ยังไม่คืน</b> (<code>return_date</code> เป็น NULL)',
      hint: 'JOIN 3 ตาราง แล้ว WHERE l.return_date IS NULL',
      solution: 'SELECT b.title, m.member_name\nFROM Loans l\nJOIN Books b ON b.book_id = l.book_id\nJOIN Members m ON m.member_id = l.member_id\nWHERE l.return_date IS NULL;',
    },

    /* ---------------- ยาก ---------------- */
    {
      id: 'h01', level: 'hard', topic: 'JOIN', dataset: 'hr', title: 'พนักงานและหัวหน้า (Self Join)',
      prompt: 'แสดงชื่อพนักงาน <code>employee</code> และชื่อหัวหน้า <code>manager</code> (ใช้ <code>first_name</code>) เฉพาะพนักงานที่ <b>มีหัวหน้า</b>',
      hint: 'JOIN ตาราง Employees กับตัวเอง: Employees e JOIN Employees m ON m.emp_id = e.manager_id',
      solution: 'SELECT e.first_name AS employee, m.first_name AS manager\nFROM Employees e\nJOIN Employees m ON m.emp_id = e.manager_id;',
    },
    {
      id: 'h02', level: 'hard', topic: 'Subquery', dataset: 'hr', title: 'เงินเดือนสูงสุดอันดับ 2',
      prompt: 'หา <b>เงินเดือนที่สูงเป็นอันดับ 2</b> ของบริษัท (แสดงค่าเดียว)',
      hint: 'หาค่า MAX ที่น้อยกว่า MAX ทั้งหมด หรือใช้ DISTINCT + ORDER BY + OFFSET',
      solution: 'SELECT MAX(salary) AS second_highest\nFROM Employees\nWHERE salary < (SELECT MAX(salary) FROM Employees);',
    },
    {
      id: 'h03', level: 'hard', topic: 'Subquery', dataset: 'school', title: 'คนที่ได้คะแนนสูงสุดในแต่ละวิชา',
      prompt: 'แสดง <code>subject_name</code>, <code>first_name</code> ของนักเรียน และ <code>score</code> ของคนที่ได้ <b>คะแนนสูงสุดในแต่ละวิชา</b>',
      hint: 'เทียบคะแนนกับ MAX(score) ของวิชาเดียวกัน (correlated subquery) หรือใช้ RANK() OVER (PARTITION BY subject_id …)',
      solution: 'SELECT sj.subject_name, st.first_name, sc.score\nFROM Scores sc\nJOIN Students st ON st.student_id = sc.student_id\nJOIN Subjects sj ON sj.subject_id = sc.subject_id\nWHERE sc.score = (SELECT MAX(s2.score) FROM Scores s2 WHERE s2.subject_id = sc.subject_id);',
    },
    {
      id: 'h04', level: 'hard', topic: 'วันที่', dataset: 'store', title: 'ยอดขายรายเดือน', ordered: true,
      prompt: 'สรุป <b>จำนวนชิ้นที่ขายได้</b> ในแต่ละเดือน แสดง 3 คอลัมน์: <code>sale_year</code>, <code>sale_month</code> (ตัวเลข) และ <code>total_qty</code> เรียงตามปีและเดือน',
      hint: 'YEAR(sale_date), MONTH(sale_date) แล้ว GROUP BY ทั้งสองค่า',
      solution: 'SELECT YEAR(sale_date) AS sale_year, MONTH(sale_date) AS sale_month, SUM(quantity) AS total_qty\nFROM Sales\nGROUP BY YEAR(sale_date), MONTH(sale_date)\nORDER BY sale_year, sale_month;',
    },
    {
      id: 'h05', level: 'hard', topic: 'GROUP BY', dataset: 'school', title: 'เกรดเฉลี่ยรายห้อง', ordered: true,
      prompt: 'แสดง <code>class_room</code> และคะแนนเฉลี่ยของนักเรียนในห้องนั้น (ทุกวิชารวมกัน) เฉพาะห้องที่ค่าเฉลี่ย <b>ตั้งแต่ 75 ขึ้นไป</b> เรียงจากมากไปน้อย',
      hint: 'JOIN Students กับ Scores, GROUP BY class_room, HAVING AVG(score * 1.0) >= 75',
      solution: 'SELECT st.class_room, AVG(sc.score * 1.0) AS avg_score\nFROM Students st\nJOIN Scores sc ON sc.student_id = st.student_id\nGROUP BY st.class_room\nHAVING AVG(sc.score * 1.0) >= 75\nORDER BY avg_score DESC;',
    },
    {
      id: 'h06', level: 'hard', topic: 'สร้างตาราง', dataset: 'school', title: 'สร้างตารางครูและผูกกับวิชา',
      prompt: "สร้างตาราง <code>Teachers</code> มี <code>teacher_id</code> (INT IDENTITY PRIMARY KEY), <code>teacher_name</code> (NVARCHAR(50) NOT NULL), <code>subject_id</code> (INT อ้างถึง <code>Subjects</code>) แล้วเพิ่มครู 2 คน: <code>N'ครูสมศรี'</code> สอนวิชา 1 และ <code>N'ครูประเสริฐ'</code> สอนวิชา 5",
      hint: 'subject_id INT FOREIGN KEY REFERENCES Subjects(subject_id) — INSERT ไม่ต้องใส่ teacher_id',
      solution: "CREATE TABLE Teachers (\n    teacher_id INT IDENTITY(1,1) PRIMARY KEY,\n    teacher_name NVARCHAR(50) NOT NULL,\n    subject_id INT FOREIGN KEY REFERENCES Subjects(subject_id)\n);\nINSERT INTO Teachers (teacher_name, subject_id) VALUES (N'ครูสมศรี', 1), (N'ครูประเสริฐ', 5);",
      check: 'SELECT teacher_name, subject_id FROM Teachers ORDER BY subject_id;',
    },
    {
      id: 'h07', level: 'hard', topic: 'JOIN', dataset: 'hr', title: 'พนักงานที่เงินเดือนสูงสุดในแผนก',
      prompt: 'แสดง <code>dept_name</code>, <code>first_name</code> และ <code>salary</code> ของพนักงานที่ได้ <b>เงินเดือนสูงสุดในแต่ละแผนก</b>',
      hint: 'ใช้ CTE ที่มี MAX(salary) ต่อ dept_id แล้ว JOIN กลับ หรือ ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC)',
      solution: 'WITH ranked AS (\n    SELECT e.*, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rn\n    FROM Employees e\n    WHERE e.dept_id IS NOT NULL\n)\nSELECT d.dept_name, r.first_name, r.salary\nFROM ranked r\nJOIN Departments d ON d.dept_id = r.dept_id\nWHERE r.rn = 1;',
    },
  ];
})(window.SBAC);
