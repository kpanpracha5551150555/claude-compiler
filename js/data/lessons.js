/* SBAC Compiler — tutorial lessons (Thai) */
(function (S) {
  'use strict';

  S.chapters = [
    { id: 'start', title: 'เริ่มต้น' },
    { id: 'query', title: 'ดึงข้อมูล' },
    { id: 'summary', title: 'สรุปข้อมูล' },
    { id: 'join', title: 'เชื่อมตาราง' },
    { id: 'dml', title: 'จัดการข้อมูล' },
    { id: 'ddl', title: 'ออกแบบตาราง' },
    { id: 'adv', title: 'ขั้นสูง' },
  ];

  S.lessons = [
    {
      id: 'intro', chapter: 'start', title: 'รู้จัก SQL และ SBAC Compiler', dataset: 'shop',
      body: `
<p><b>SQL</b> (Structured Query Language) คือภาษาสำหรับสั่งงานฐานข้อมูลเชิงสัมพันธ์ ข้อมูลถูกเก็บเป็น <b>ตาราง</b>
แต่ละตารางมี <b>คอลัมน์</b> (ชนิดของข้อมูล) และ <b>แถว</b> (ข้อมูลแต่ละรายการ)</p>
<p>บทเรียนนี้ใช้ฐานข้อมูลร้านค้าออนไลน์ 3 ตาราง คือ <code>Customers</code>, <code>Orders</code> และ <code>Shippings</code>
กดดู "ตารางที่ใช้ในบทนี้" ด้านบนได้ตลอด</p>
<h2>ใช้งาน Compiler</h2>
<ul>
  <li>มีหลายไฟล์ได้ในแท็บด้านบน เช่น <code>init.sql</code> (สร้างตาราง) และ <code>queries.sql</code> (คำสั่งค้นหา)</li>
  <li>ปุ่ม <b>Run</b> จะรัน <b>เฉพาะแท็บที่เปิดอยู่</b> — บนปุ่มจะแสดงชื่อไฟล์ที่จะถูกรันเสมอ</li>
  <li>ทุกแท็บใช้ฐานข้อมูลเดียวกัน: รัน <code>init.sql</code> หนึ่งครั้ง แล้วสลับไป <code>queries.sql</code> เพื่อค้นหาได้เลย</li>
  <li>คีย์ลัด <kbd>Ctrl</kbd> + <kbd>Enter</kbd> = รัน, ถ้าเลือกข้อความไว้จะรันเฉพาะส่วนที่เลือก</li>
  <li>ถ้าอยากเริ่มใหม่ ใช้เมนู ⋮ → <b>Reset ฐานข้อมูล</b></li>
</ul>
<div class="callout tip">ลองกด ▶ รัน ที่ตัวอย่างด้านล่าง ผลลัพธ์จะแสดงใต้โค้ดทันที (ตัวอย่างในบทเรียนรันบนฐานข้อมูลชั่วคราว ไม่กระทบงานของคุณ)</div>`,
      examples: [{ title: 'ตัวอย่างแรก', code: "SELECT 'สวัสดี SQL' AS message;\n\nSELECT * FROM Customers;" }],
    },

    {
      id: 'select', chapter: 'query', title: 'SELECT — ดึงข้อมูลจากตาราง', dataset: 'shop',
      syntax: 'SELECT column1, column2, ...\nFROM table_name;',
      body: `
<p>คำสั่ง <code>SELECT</code> ใช้เลือกคอลัมน์ที่ต้องการจากตาราง ใช้ <code>*</code> เพื่อเลือกทุกคอลัมน์</p>
<ul>
  <li><code>SELECT * FROM Customers;</code> — ทุกคอลัมน์ ทุกแถว</li>
  <li><code>SELECT first_name, country FROM Customers;</code> — เฉพาะบางคอลัมน์ ตามลำดับที่เขียน</li>
  <li><code>SELECT DISTINCT country FROM Customers;</code> — ตัดค่าซ้ำออก</li>
</ul>
<div class="callout">ใน SQL Server เครื่องหมาย <code>;</code> ท้ายคำสั่งไม่บังคับ แต่ควรใส่ให้เป็นนิสัย เพราะ MySQL และฐานข้อมูลอื่นต้องใช้</div>`,
      examples: [
        { title: 'เลือกทุกคอลัมน์', code: 'SELECT * FROM Customers;' },
        { title: 'เลือกบางคอลัมน์', code: 'SELECT first_name, last_name FROM Customers;' },
        { title: 'ตัดค่าซ้ำด้วย DISTINCT', code: 'SELECT DISTINCT country FROM Customers;' },
      ],
      practice: { task: 'แสดงคอลัมน์ <code>item</code> และ <code>amount</code> ของทุกคำสั่งซื้อในตาราง <code>Orders</code>', solution: 'SELECT item, amount FROM Orders;' },
    },

    {
      id: 'where', chapter: 'query', title: 'WHERE — กรองข้อมูลตามเงื่อนไข', dataset: 'shop',
      syntax: 'SELECT columns\nFROM table_name\nWHERE condition;',
      body: `
<p><code>WHERE</code> ใช้เลือกเฉพาะแถวที่ตรงเงื่อนไข ตัวดำเนินการที่ใช้บ่อย:</p>
<ul>
  <li><code>=</code> เท่ากับ, <code>&lt;&gt;</code> หรือ <code>!=</code> ไม่เท่ากับ</li>
  <li><code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> มากกว่า/น้อยกว่า</li>
</ul>
<p>ข้อความต้องอยู่ในเครื่องหมาย <code>'…'</code> (single quote) ส่วนตัวเลขไม่ต้อง</p>
<div class="callout">SQL Server เปรียบเทียบข้อความแบบไม่สนตัวพิมพ์เล็ก-ใหญ่ (case-insensitive) ดังนั้น <code>'usa'</code> กับ <code>'USA'</code> ถือว่าเท่ากัน — ภาษาไทยให้ใส่ <code>N'…'</code> เช่น <code>N'สมชาย'</code></div>`,
      examples: [
        { title: 'ลูกค้าในประเทศ USA', code: "SELECT * FROM Customers\nWHERE country = 'USA';" },
        { title: 'อายุมากกว่า 25 ปี', code: 'SELECT first_name, age\nFROM Customers\nWHERE age > 25;' },
      ],
      practice: { task: 'แสดงข้อมูลทุกคอลัมน์ของลูกค้าที่มีอายุ <b>22 ปี</b>', solution: 'SELECT * FROM Customers WHERE age = 22;' },
    },

    {
      id: 'operators', chapter: 'query', title: 'AND, OR, IN, BETWEEN, LIKE', dataset: 'shop',
      syntax: "WHERE a = 1 AND b = 2\nWHERE country IN ('UK', 'USA')\nWHERE age BETWEEN 20 AND 30\nWHERE first_name LIKE 'J%'\nWHERE column IS NULL",
      body: `
<ul>
  <li><code>AND</code> ต้องจริงทุกเงื่อนไข, <code>OR</code> จริงข้อใดข้อหนึ่ง, <code>NOT</code> กลับค่า</li>
  <li><code>IN (…)</code> ตรงกับค่าใดค่าหนึ่งในรายการ</li>
  <li><code>BETWEEN a AND b</code> อยู่ในช่วง (รวมขอบ)</li>
  <li><code>LIKE</code> ค้นหาตามรูปแบบ: <code>%</code> = อักขระกี่ตัวก็ได้, <code>_</code> = อักขระ 1 ตัว</li>
  <li><code>IS NULL</code> / <code>IS NOT NULL</code> ตรวจค่าว่าง (ห้ามใช้ <code>= NULL</code>)</li>
</ul>
<div class="callout">ถ้าใช้ AND กับ OR ร่วมกัน ให้ใส่วงเล็บกำกับเสมอ เช่น <code>WHERE (country = 'UK' OR country = 'USA') AND age &lt; 30</code></div>`,
      examples: [
        { title: 'IN และ BETWEEN', code: "SELECT * FROM Customers\nWHERE country IN ('UK', 'UAE')\n  AND age BETWEEN 20 AND 30;" },
        { title: 'LIKE — ชื่อขึ้นต้นด้วย J', code: "SELECT first_name, last_name\nFROM Customers\nWHERE first_name LIKE 'J%';" },
        { title: 'LIKE — นามสกุลลงท้ายด้วย n', code: "SELECT * FROM Customers WHERE last_name LIKE '%n';" },
      ],
      practice: { task: 'แสดงข้อมูลลูกค้าที่ชื่อ (<code>first_name</code>) ขึ้นต้นด้วยตัว <b>J</b> <u>และ</u> อยู่ประเทศ <b>UK</b>', solution: "SELECT * FROM Customers WHERE first_name LIKE 'J%' AND country = 'UK';" },
    },

    {
      id: 'order-top', chapter: 'query', title: 'ORDER BY และ TOP', dataset: 'shop',
      syntax: 'SELECT TOP n columns\nFROM table_name\nORDER BY column [ASC | DESC];',
      body: `
<p><code>ORDER BY</code> เรียงผลลัพธ์ — <code>ASC</code> น้อยไปมาก (ค่าเริ่มต้น), <code>DESC</code> มากไปน้อย เรียงหลายคอลัมน์ได้ เช่น <code>ORDER BY country, age DESC</code></p>
<p><code>TOP n</code> (SQL Server) เลือกเฉพาะ n แถวแรก ใช้คู่กับ ORDER BY เพื่อหา "อันดับต้น ๆ"</p>
<div class="callout">MySQL / SQLite ใช้ <code>LIMIT n</code> ท้ายคำสั่งแทน <code>TOP</code> — ส่วน SQL Server แบบมาตรฐานใหม่ใช้ <code>OFFSET 0 ROWS FETCH NEXT n ROWS ONLY</code> ซึ่ง SBAC Compiler รองรับทั้งหมด</div>`,
      examples: [
        { title: 'เรียงตามอายุมากไปน้อย', code: 'SELECT first_name, age\nFROM Customers\nORDER BY age DESC;' },
        { title: 'TOP 3', code: 'SELECT TOP 3 *\nFROM Orders\nORDER BY amount DESC;' },
        { title: 'OFFSET / FETCH (ข้าม 2 แถวแรก)', code: 'SELECT * FROM Orders\nORDER BY order_id\nOFFSET 2 ROWS FETCH NEXT 2 ROWS ONLY;' },
      ],
      practice: { task: 'แสดง <code>item</code> และ <code>amount</code> ของคำสั่งซื้อที่มียอด <code>amount</code> สูงสุด <b>2 อันดับแรก</b> เรียงจากมากไปน้อย', solution: 'SELECT TOP 2 item, amount FROM Orders ORDER BY amount DESC;', ordered: true },
    },

    {
      id: 'aggregate', chapter: 'summary', title: 'ฟังก์ชันรวม COUNT, SUM, AVG, MIN, MAX', dataset: 'shop',
      syntax: 'SELECT COUNT(*), SUM(col), AVG(col), MIN(col), MAX(col)\nFROM table_name;',
      body: `
<p>ฟังก์ชันรวม (aggregate) คำนวณค่าจากหลายแถวให้เหลือค่าเดียว</p>
<ul>
  <li><code>COUNT(*)</code> นับจำนวนแถว, <code>COUNT(col)</code> นับเฉพาะที่ไม่เป็น NULL</li>
  <li><code>SUM</code> ผลรวม, <code>AVG</code> ค่าเฉลี่ย, <code>MIN</code> / <code>MAX</code> ค่าต่ำสุด/สูงสุด</li>
</ul>
<div class="callout">ใน SQL Server <code>AVG</code> ของคอลัมน์ INT จะได้ผลเป็นจำนวนเต็ม ถ้าต้องการทศนิยมให้คูณ 1.0 ก่อน เช่น <code>AVG(amount * 1.0)</code></div>`,
      examples: [
        { title: 'สรุปคำสั่งซื้อ', code: 'SELECT COUNT(*) AS total_orders,\n       SUM(amount) AS total_amount,\n       AVG(amount * 1.0) AS avg_amount,\n       MIN(amount) AS min_amount,\n       MAX(amount) AS max_amount\nFROM Orders;' },
        { title: 'นับลูกค้าในประเทศ UK', code: "SELECT COUNT(*) AS uk_customers\nFROM Customers\nWHERE country = 'UK';" },
      ],
      practice: { task: 'หา <b>ยอดรวม</b> <code>amount</code> ทั้งหมด และ <b>จำนวน</b> คำสั่งซื้อ จากตาราง <code>Orders</code> (2 คอลัมน์)', solution: 'SELECT SUM(amount) AS total, COUNT(*) AS orders FROM Orders;' },
    },

    {
      id: 'group-by', chapter: 'summary', title: 'GROUP BY และ HAVING', dataset: 'shop',
      syntax: 'SELECT col, AGG(col2)\nFROM table_name\nGROUP BY col\nHAVING condition;',
      body: `
<p><code>GROUP BY</code> แบ่งแถวเป็นกลุ่มตามค่าในคอลัมน์ แล้วใช้ฟังก์ชันรวมกับแต่ละกลุ่ม</p>
<p><code>HAVING</code> กรอง <b>กลุ่ม</b> หลังรวมแล้ว (ส่วน <code>WHERE</code> กรอง <b>แถว</b> ก่อนรวม)</p>
<div class="callout">คอลัมน์ที่อยู่ใน SELECT ต้องอยู่ใน GROUP BY หรืออยู่ในฟังก์ชันรวมเท่านั้น</div>`,
      examples: [
        { title: 'จำนวนลูกค้าต่อประเทศ', code: 'SELECT country, COUNT(*) AS customers\nFROM Customers\nGROUP BY country;' },
        { title: 'ยอดซื้อรวมของลูกค้าแต่ละคน', code: 'SELECT customer_id, SUM(amount) AS total\nFROM Orders\nGROUP BY customer_id\nORDER BY total DESC;' },
      ],
      practice: { task: 'แสดง <code>country</code> และจำนวนลูกค้า เฉพาะประเทศที่มีลูกค้า <b>มากกว่า 1 คน</b>', solution: 'SELECT country, COUNT(*) AS customers FROM Customers GROUP BY country HAVING COUNT(*) > 1;' },
    },

    {
      id: 'alias-case', chapter: 'summary', title: 'AS (ตั้งชื่อ) และ CASE WHEN', dataset: 'shop',
      syntax: "SELECT col AS new_name,\n       CASE WHEN condition THEN 'a' ELSE 'b' END AS label\nFROM table_name;",
      body: `
<p><code>AS</code> ตั้งชื่อเล่นให้คอลัมน์หรือตาราง ทำให้ผลลัพธ์อ่านง่าย</p>
<p>ต่อข้อความใน SQL Server ใช้ <code>+</code> เช่น <code>first_name + ' ' + last_name</code> หรือใช้ <code>CONCAT(a, ' ', b)</code> ก็ได้</p>
<p><code>CASE WHEN … THEN … ELSE … END</code> คือ if-else ของ SQL ใช้จัดกลุ่มหรือแปลงค่า</p>`,
      examples: [
        { title: 'ชื่อเต็ม', code: "SELECT first_name + ' ' + last_name AS full_name, country\nFROM Customers;" },
        { title: 'จัดระดับคำสั่งซื้อ', code: "SELECT item, amount,\n    CASE\n        WHEN amount >= 1000 THEN 'สูง'\n        WHEN amount >= 300 THEN 'กลาง'\n        ELSE 'ต่ำ'\n    END AS level\nFROM Orders;" },
      ],
      practice: { task: "แสดงชื่อเต็ม <code>full_name</code> (ชื่อ เว้นวรรค นามสกุล) และ <code>age_group</code> โดยถ้าอายุตั้งแต่ 28 ปีขึ้นไปให้เป็น <code>'Senior'</code> นอกนั้น <code>'Junior'</code>", solution: "SELECT first_name + ' ' + last_name AS full_name,\n       CASE WHEN age >= 28 THEN 'Senior' ELSE 'Junior' END AS age_group\nFROM Customers;" },
    },

    {
      id: 'inner-join', chapter: 'join', title: 'INNER JOIN — เชื่อมข้อมูลจาก 2 ตาราง', dataset: 'shop',
      syntax: 'SELECT a.col, b.col\nFROM table_a a\nINNER JOIN table_b b ON b.key = a.key;',
      body: `
<p>ตาราง <code>Orders</code> เก็บ <code>customer_id</code> ไว้อ้างถึงลูกค้า ถ้าอยากเห็น <b>ชื่อลูกค้า</b> คู่กับสินค้าที่สั่ง ต้องเชื่อมตารางด้วย <code>JOIN</code></p>
<p><code>INNER JOIN</code> (หรือเขียนแค่ <code>JOIN</code>) จะแสดงเฉพาะแถวที่ <b>จับคู่ได้ทั้งสองฝั่ง</b> ตามเงื่อนไขใน <code>ON</code></p>
<div class="callout">ตั้งชื่อย่อตาราง เช่น <code>Customers c</code> แล้วอ้างคอลัมน์ด้วย <code>c.first_name</code> ช่วยให้โค้ดสั้นและไม่สับสนเมื่อคอลัมน์ชื่อซ้ำกัน</div>`,
      examples: [
        { title: 'ลูกค้าและสินค้าที่สั่ง', code: 'SELECT c.first_name, c.country, o.item, o.amount\nFROM Customers c\nINNER JOIN Orders o ON o.customer_id = c.customer_id;' },
      ],
      practice: { task: 'แสดง <code>first_name</code> ของลูกค้า และ <code>status</code> การจัดส่งจากตาราง <code>Shippings</code> (คอลัมน์ <code>Shippings.customer</code> อ้างถึง <code>Customers.customer_id</code>)', solution: 'SELECT c.first_name, s.status FROM Customers c JOIN Shippings s ON s.customer = c.customer_id;' },
    },

    {
      id: 'left-join', chapter: 'join', title: 'LEFT JOIN — เก็บข้อมูลฝั่งซ้ายไว้ทั้งหมด', dataset: 'shop',
      syntax: 'SELECT a.col, b.col\nFROM table_a a\nLEFT JOIN table_b b ON b.key = a.key;',
      body: `
<p><code>LEFT JOIN</code> แสดงทุกแถวของตารางฝั่งซ้าย ถ้าไม่มีคู่ในตารางขวา คอลัมน์ฝั่งขวาจะเป็น <code>NULL</code></p>
<p>เทคนิคยอดนิยม: หา "ข้อมูลที่ไม่มีคู่" ด้วย <code>LEFT JOIN … WHERE b.key IS NULL</code></p>
<div class="callout">มี <code>RIGHT JOIN</code> (กลับด้าน) และ <code>FULL OUTER JOIN</code> (ทั้งสองฝั่ง) ด้วย แต่ในงานจริง LEFT JOIN ใช้บ่อยที่สุด</div>`,
      examples: [
        { title: 'ลูกค้าทุกคนกับคำสั่งซื้อ (ถ้ามี)', code: 'SELECT c.first_name, o.item\nFROM Customers c\nLEFT JOIN Orders o ON o.customer_id = c.customer_id;' },
      ],
      practice: { task: 'แสดง <code>first_name</code> และ <code>last_name</code> ของลูกค้าที่ <b>ยังไม่เคยสั่งซื้อเลย</b>', solution: 'SELECT c.first_name, c.last_name FROM Customers c LEFT JOIN Orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;' },
    },

    {
      id: 'insert', chapter: 'dml', title: 'INSERT — เพิ่มข้อมูล', dataset: 'shop',
      syntax: 'INSERT INTO table_name (col1, col2, ...)\nVALUES (val1, val2, ...);',
      body: `
<p><code>INSERT INTO</code> เพิ่มแถวใหม่ ระบุคอลัมน์แล้วใส่ค่าตามลำดับเดียวกัน เพิ่มหลายแถวพร้อมกันได้โดยคั่นด้วย <code>,</code></p>
<p>หลังรันจะเห็นข้อความ <code>(1 row affected)</code> บอกจำนวนแถวที่ถูกเพิ่ม</p>
<div class="callout tip">ในบทเรียน ทุกครั้งที่กดรันจะเริ่มจากข้อมูลตั้งต้นใหม่ จึงทดลองเพิ่ม/แก้/ลบได้ไม่ต้องกลัวพัง</div>`,
      examples: [
        { title: 'เพิ่มลูกค้า 1 คน', code: "INSERT INTO Customers (customer_id, first_name, last_name, age, country)\nVALUES (6, 'Mali', 'Suksawat', 24, 'Thailand');\n\nSELECT * FROM Customers;" },
      ],
      practice: {
        task: "เพิ่มลูกค้าใหม่ <code>customer_id</code> = 6, ชื่อ <code>'Somchai'</code>, นามสกุล <code>'Jaidee'</code>, อายุ 30, ประเทศ <code>'Thailand'</code>",
        solution: "INSERT INTO Customers (customer_id, first_name, last_name, age, country)\nVALUES (6, 'Somchai', 'Jaidee', 30, 'Thailand');",
        check: 'SELECT * FROM Customers ORDER BY customer_id;',
      },
    },

    {
      id: 'update-delete', chapter: 'dml', title: 'UPDATE และ DELETE', dataset: 'shop',
      syntax: "UPDATE table_name SET col = value WHERE condition;\nDELETE FROM table_name WHERE condition;",
      body: `
<p><code>UPDATE</code> แก้ไขข้อมูล, <code>DELETE</code> ลบแถว — <b>อย่าลืม WHERE</b> ไม่อย่างนั้นจะกระทบทุกแถวในตาราง!</p>
<div class="callout">นิสัยที่ดี: ลอง <code>SELECT … WHERE …</code> ด้วยเงื่อนไขเดียวกันก่อน เพื่อดูว่าแถวไหนจะถูกแก้/ลบ</div>`,
      examples: [
        { title: 'แก้ราคา', code: "UPDATE Orders\nSET amount = 450\nWHERE item = 'Keyboard';\n\nSELECT * FROM Orders;" },
        { title: 'ลบคำสั่งซื้อ', code: 'DELETE FROM Orders\nWHERE amount < 300;\n\nSELECT * FROM Orders;' },
      ],
      practice: {
        task: "เปลี่ยน <code>status</code> ของ <code>shipping_id</code> = 1 เป็น <code>'Delivered'</code> และลบแถว <code>shipping_id</code> = 5 ออกจากตาราง <code>Shippings</code>",
        solution: "UPDATE Shippings SET status = 'Delivered' WHERE shipping_id = 1;\nDELETE FROM Shippings WHERE shipping_id = 5;",
        check: 'SELECT * FROM Shippings ORDER BY shipping_id;',
      },
    },

    {
      id: 'create-table', chapter: 'ddl', title: 'CREATE TABLE และชนิดข้อมูล', dataset: 'shop',
      syntax: 'CREATE TABLE table_name (\n    id INT IDENTITY(1,1) PRIMARY KEY,\n    name NVARCHAR(100) NOT NULL,\n    price DECIMAL(10,2) DEFAULT 0\n);',
      body: `
<p>ชนิดข้อมูลที่ใช้บ่อยใน SQL Server:</p>
<ul>
  <li><code>INT</code> จำนวนเต็ม, <code>DECIMAL(p,s)</code> ทศนิยมแม่นยำ (เช่นเงิน)</li>
  <li><code>VARCHAR(n)</code> ข้อความภาษาอังกฤษ, <code>NVARCHAR(n)</code> ข้อความ Unicode (ภาษาไทย)</li>
  <li><code>DATE</code> วันที่, <code>DATETIME</code> วันที่และเวลา, <code>BIT</code> 0/1</li>
</ul>
<p>ข้อกำหนด (constraint): <code>PRIMARY KEY</code>, <code>NOT NULL</code>, <code>DEFAULT</code>, <code>UNIQUE</code>, <code>CHECK</code> และ <code>IDENTITY(1,1)</code> ให้รหัสเพิ่มอัตโนมัติ</p>
<div class="callout">ลบตารางด้วย <code>DROP TABLE ชื่อ;</code> หรือ <code>DROP TABLE IF EXISTS ชื่อ;</code> เพื่อไม่ให้ error ถ้ายังไม่มีตาราง</div>`,
      examples: [
        { title: 'สร้างตาราง + IDENTITY', code: "CREATE TABLE Products (\n    product_id INT IDENTITY(1,1) PRIMARY KEY,\n    name NVARCHAR(50) NOT NULL,\n    price DECIMAL(10,2) CHECK (price >= 0)\n);\n\nINSERT INTO Products (name, price) VALUES (N'ปากกา', 15), (N'สมุด', 25);\nSELECT * FROM Products;" },
      ],
      practice: {
        task: "สร้างตาราง <code>Items</code> มีคอลัมน์ <code>item_id</code> (INT, PRIMARY KEY), <code>name</code> (NVARCHAR(50)), <code>price</code> (DECIMAL(10,2)) แล้วเพิ่ม 2 แถว: <code>(1, 'Pen', 15)</code> และ <code>(2, 'Book', 120)</code>",
        solution: "CREATE TABLE Items (\n    item_id INT PRIMARY KEY,\n    name NVARCHAR(50),\n    price DECIMAL(10,2)\n);\nINSERT INTO Items VALUES (1, 'Pen', 15), (2, 'Book', 120);",
        check: 'SELECT * FROM Items ORDER BY 1;',
      },
    },

    {
      id: 'keys', chapter: 'ddl', title: 'PRIMARY KEY และ FOREIGN KEY', dataset: 'shop',
      syntax: 'customer_id INT FOREIGN KEY REFERENCES Customers(customer_id)\n-- หรือ\nCONSTRAINT fk_name FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)',
      body: `
<p><b>PRIMARY KEY</b> คือคอลัมน์ที่ระบุแต่ละแถวได้ไม่ซ้ำ (ห้ามซ้ำ ห้าม NULL)</p>
<p><b>FOREIGN KEY</b> คือคอลัมน์ที่อ้างถึง PRIMARY KEY ของอีกตาราง ช่วยป้องกันข้อมูลที่อ้างถึงสิ่งที่ไม่มีอยู่จริง เช่น คำสั่งซื้อของลูกค้ารหัส 99 ที่ไม่มีในระบบ</p>
<p>ลองรันตัวอย่างที่ 2 แล้วดู error ที่เกิดขึ้น</p>`,
      examples: [
        { title: 'สร้างตารางที่อ้างถึงลูกค้า', code: 'CREATE TABLE Payments (\n    payment_id INT IDENTITY(1,1) PRIMARY KEY,\n    customer_id INT FOREIGN KEY REFERENCES Customers(customer_id),\n    paid INT NOT NULL\n);\n\nINSERT INTO Payments (customer_id, paid) VALUES (1, 400);\nSELECT * FROM Payments;' },
        { title: 'ละเมิด FOREIGN KEY (ตั้งใจให้ error)', code: "INSERT INTO Orders (order_id, item, amount, customer_id)\nVALUES (6, 'Webcam', 900, 99);" },
      ],
      practice: {
        task: 'สร้างตาราง <code>Reviews</code> มี <code>review_id</code> (INT IDENTITY PRIMARY KEY), <code>customer_id</code> (INT อ้างถึง Customers), <code>rating</code> (INT ค่า 1–5) แล้วเพิ่มรีวิวของลูกค้า 1 ให้ 5 คะแนน และลูกค้า 3 ให้ 4 คะแนน',
        solution: 'CREATE TABLE Reviews (\n    review_id INT IDENTITY(1,1) PRIMARY KEY,\n    customer_id INT FOREIGN KEY REFERENCES Customers(customer_id),\n    rating INT CHECK (rating BETWEEN 1 AND 5)\n);\nINSERT INTO Reviews (customer_id, rating) VALUES (1, 5), (3, 4);',
        check: 'SELECT customer_id, rating FROM Reviews ORDER BY customer_id;',
      },
    },

    {
      id: 'subquery', chapter: 'adv', title: 'Subquery — คำสั่งซ้อนคำสั่ง', dataset: 'shop',
      syntax: 'SELECT * FROM t\nWHERE col > (SELECT AVG(col) FROM t);\n\nSELECT * FROM t\nWHERE id IN (SELECT id FROM other);',
      body: `
<p>Subquery คือ SELECT ที่อยู่ในวงเล็บภายในอีกคำสั่ง ใช้ได้ใน WHERE, FROM หรือ SELECT</p>
<ul>
  <li>ได้ค่าเดียว → ใช้กับ <code>=</code>, <code>&gt;</code>, <code>&lt;</code></li>
  <li>ได้หลายค่า → ใช้กับ <code>IN</code>, <code>EXISTS</code></li>
</ul>`,
      examples: [
        { title: 'ลูกค้าที่เคยสั่ง Keyboard', code: "SELECT first_name, last_name\nFROM Customers\nWHERE customer_id IN (\n    SELECT customer_id FROM Orders WHERE item = 'Keyboard'\n);" },
        { title: 'ลูกค้าที่อายุมากกว่าค่าเฉลี่ย', code: 'SELECT first_name, age\nFROM Customers\nWHERE age > (SELECT AVG(age * 1.0) FROM Customers);' },
      ],
      practice: { task: 'แสดง <code>item</code> และ <code>amount</code> ของคำสั่งซื้อที่ <code>amount</code> <b>มากกว่าค่าเฉลี่ย</b> ของทุกคำสั่งซื้อ', solution: 'SELECT item, amount FROM Orders WHERE amount > (SELECT AVG(amount) FROM Orders);' },
    },

    {
      id: 'cte-window', chapter: 'adv', title: 'CTE (WITH) และ Window Functions', dataset: 'shop',
      syntax: 'WITH name AS (\n    SELECT ...\n)\nSELECT * FROM name;\n\nSELECT col, RANK() OVER (ORDER BY col DESC) AS rnk\nFROM t;',
      body: `
<p><b>CTE</b> (Common Table Expression) ตั้งชื่อให้ผลลัพธ์ชั่วคราวด้วย <code>WITH</code> ทำให้คำสั่งยาว ๆ อ่านง่ายขึ้น</p>
<p><b>Window function</b> คำนวณข้ามแถวโดยไม่ยุบแถว เช่น <code>ROW_NUMBER()</code>, <code>RANK()</code>, <code>SUM(…) OVER (…)</code></p>
<ul>
  <li><code>PARTITION BY</code> แบ่งกลุ่ม (คล้าย GROUP BY แต่ไม่ยุบแถว)</li>
  <li><code>ORDER BY</code> ใน OVER กำหนดลำดับการนับ</li>
</ul>`,
      examples: [
        { title: 'CTE ยอดซื้อรวมต่อลูกค้า', code: 'WITH totals AS (\n    SELECT customer_id, SUM(amount) AS total\n    FROM Orders\n    GROUP BY customer_id\n)\nSELECT c.first_name, t.total\nFROM totals t\nJOIN Customers c ON c.customer_id = t.customer_id\nORDER BY t.total DESC;' },
        { title: 'ลำดับลูกค้าในแต่ละประเทศตามอายุ', code: 'SELECT country, first_name, age,\n    ROW_NUMBER() OVER (PARTITION BY country ORDER BY age DESC) AS rn\nFROM Customers;' },
      ],
      practice: { task: 'แสดง <code>item</code>, <code>amount</code> และอันดับ <code>rnk</code> ของคำสั่งซื้อ โดยจัดอันดับตาม <code>amount</code> จากมากไปน้อยด้วย <code>RANK()</code>', solution: 'SELECT item, amount, RANK() OVER (ORDER BY amount DESC) AS rnk FROM Orders;' },
    },
  ];
})(window.SBAC);
