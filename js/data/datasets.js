/* SBAC Compiler — sample datasets (portable SQL: works in SQL Server / MySQL / SQLite modes) */
(function (S) {
  'use strict';

  const shop = `-- ร้านค้าออนไลน์: ลูกค้า / คำสั่งซื้อ / การจัดส่ง
CREATE TABLE Customers (
    customer_id INT PRIMARY KEY,
    first_name  VARCHAR(50),
    last_name   VARCHAR(50),
    age         INT,
    country     VARCHAR(30)
);

INSERT INTO Customers (customer_id, first_name, last_name, age, country) VALUES
(1, 'John',   'Doe',       31, 'USA'),
(2, 'Robert', 'Luna',      22, 'USA'),
(3, 'David',  'Robinson',  22, 'UK'),
(4, 'John',   'Reinhardt', 25, 'UK'),
(5, 'Betty',  'Doe',       28, 'UAE');

CREATE TABLE Orders (
    order_id    INT PRIMARY KEY,
    item        VARCHAR(50),
    amount      INT,
    customer_id INT REFERENCES Customers(customer_id)
);

INSERT INTO Orders (order_id, item, amount, customer_id) VALUES
(1, 'Keyboard', 400,   4),
(2, 'Mouse',    300,   4),
(3, 'Monitor',  12000, 3),
(4, 'Keyboard', 400,   1),
(5, 'Mousepad', 250,   2);

CREATE TABLE Shippings (
    shipping_id INT PRIMARY KEY,
    status      VARCHAR(20),
    customer    INT REFERENCES Customers(customer_id)
);

INSERT INTO Shippings (shipping_id, status, customer) VALUES
(1, 'Pending',   2),
(2, 'Pending',   4),
(3, 'Delivered', 3),
(4, 'Pending',   5),
(5, 'Delivered', 1);
`;

  const continents = `CREATE TABLE continents (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO continents (name) VALUES
('Africa'),
('Antarctica'),
('Asia'),
('Europe'),
('North America'),
('South America'),
('Australia');
GO
`;

  const school = `-- โรงเรียน: นักเรียน / วิชา / คะแนน
CREATE TABLE Students (
    student_id INT PRIMARY KEY,
    first_name NVARCHAR(50),
    last_name  NVARCHAR(50),
    gender     NVARCHAR(10),
    class_room NVARCHAR(10),
    birth_date DATE
);

INSERT INTO Students VALUES
(1,  N'สมชาย',     N'ใจดี',     N'ชาย',  N'ม.4/1', '2009-03-14'),
(2,  N'สมหญิง',    N'รักเรียน',  N'หญิง', N'ม.4/1', '2009-07-22'),
(3,  N'ณัฐพล',     N'ศรีสุข',    N'ชาย',  N'ม.4/2', '2009-01-05'),
(4,  N'กมลชนก',    N'วงศ์ทอง',   N'หญิง', N'ม.4/2', '2008-11-30'),
(5,  N'ธนากร',     N'แก้วมณี',   N'ชาย',  N'ม.5/1', '2008-05-18'),
(6,  N'พิมพ์ชนก',   N'สายใจ',    N'หญิง', N'ม.5/1', '2008-09-09'),
(7,  N'วรเมธ',     N'บุญมา',     N'ชาย',  N'ม.5/2', '2007-12-25'),
(8,  N'ปวีณา',     N'ทองดี',     N'หญิง', N'ม.5/2', '2008-02-14'),
(9,  N'กิตติพัฒน์', N'มั่นคง',    N'ชาย',  N'ม.6/1', '2007-06-01'),
(10, N'ชนิดา',     N'พรหมมา',   N'หญิง', N'ม.6/1', '2007-08-19');

CREATE TABLE Subjects (
    subject_id   INT PRIMARY KEY,
    subject_name NVARCHAR(50),
    credit       DECIMAL(3,1)
);

INSERT INTO Subjects VALUES
(1, N'คณิตศาสตร์', 1.5),
(2, N'วิทยาศาสตร์', 1.5),
(3, N'ภาษาไทย', 1.0),
(4, N'ภาษาอังกฤษ', 1.0),
(5, N'คอมพิวเตอร์', 1.0);

CREATE TABLE Scores (
    score_id   INT PRIMARY KEY,
    student_id INT REFERENCES Students(student_id),
    subject_id INT REFERENCES Subjects(subject_id),
    score      INT
);

INSERT INTO Scores VALUES
(1, 1, 1, 78), (2, 1, 2, 65), (3, 1, 5, 88),
(4, 2, 1, 92), (5, 2, 3, 85), (6, 2, 4, 90),
(7, 3, 1, 55), (8, 3, 2, 71), (9, 3, 5, 95),
(10, 4, 3, 80), (11, 4, 4, 76), (12, 4, 2, 68),
(13, 5, 1, 61), (14, 5, 5, 73), (15, 5, 4, 58),
(16, 6, 1, 88), (17, 6, 2, 91), (18, 6, 3, 84),
(19, 7, 2, 49), (20, 7, 4, 62), (21, 7, 5, 70),
(22, 8, 1, 74), (23, 8, 3, 93), (24, 8, 4, 81),
(25, 9, 1, 97), (26, 9, 2, 89), (27, 9, 5, 99),
(28, 10, 3, 87), (29, 10, 4, 94), (30, 10, 2, 79);
`;

  const store = `-- ร้านสะดวกซื้อ: หมวดหมู่ / สินค้า / การขาย
CREATE TABLE Categories (
    category_id   INT PRIMARY KEY,
    category_name NVARCHAR(50)
);

INSERT INTO Categories VALUES
(1, N'เครื่องดื่ม'), (2, N'ขนม'), (3, N'เครื่องเขียน'), (4, N'ของใช้'), (5, N'ผลไม้');

CREATE TABLE Products (
    product_id   INT PRIMARY KEY,
    product_name NVARCHAR(50),
    category_id  INT REFERENCES Categories(category_id),
    price        DECIMAL(10,2),
    stock        INT
);

INSERT INTO Products VALUES
(1,  N'น้ำเปล่า',     1, 7,  120),
(2,  N'ชาเขียว',      1, 20, 80),
(3,  N'กาแฟเย็น',     1, 35, 40),
(4,  N'มันฝรั่งทอด',   2, 25, 60),
(5,  N'คุกกี้',        2, 30, 0),
(6,  N'ช็อกโกแลต',    2, 45, 25),
(7,  N'ปากกา',       3, 15, 200),
(8,  N'สมุด',         3, 25, 150),
(9,  N'ยางลบ',       3, 10, 0),
(10, N'สบู่',          4, 29, 35),
(11, N'ยาสีฟัน',      4, 59, 20),
(12, N'ทิชชู่',        4, 39, 50);

CREATE TABLE Sales (
    sale_id    INT PRIMARY KEY,
    product_id INT REFERENCES Products(product_id),
    quantity   INT,
    sale_date  DATE
);

INSERT INTO Sales VALUES
(1,  1, 10, '2024-01-05'), (2,  2, 4, '2024-01-05'), (3,  4, 3, '2024-01-12'),
(4,  7, 20, '2024-01-20'), (5,  3, 2, '2024-01-28'), (6,  1, 15, '2024-02-02'),
(7,  6, 5, '2024-02-10'),  (8,  8, 6, '2024-02-14'), (9,  2, 8, '2024-02-21'),
(10, 10, 3, '2024-02-25'), (11, 11, 2, '2024-03-03'), (12, 1, 12, '2024-03-08'),
(13, 3, 6, '2024-03-15'),  (14, 12, 4, '2024-03-22'), (15, 7, 10, '2024-03-30');
`;

  const hr = `-- บริษัท: แผนก / พนักงาน
CREATE TABLE Departments (
    dept_id   INT PRIMARY KEY,
    dept_name VARCHAR(50),
    location  VARCHAR(50)
);

INSERT INTO Departments VALUES
(10, 'IT',        'Bangkok'),
(20, 'Sales',     'Bangkok'),
(30, 'HR',        'Chiang Mai'),
(40, 'Finance',   'Khon Kaen'),
(50, 'Marketing', 'Phuket');

CREATE TABLE Employees (
    emp_id     INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name  VARCHAR(50),
    dept_id    INT REFERENCES Departments(dept_id),
    salary     INT,
    hire_date  DATE,
    manager_id INT REFERENCES Employees(emp_id)
);

INSERT INTO Employees VALUES
(1,  'Anan',     'Srisuk',    10, 85000, '2015-03-01', NULL),
(2,  'Benja',    'Thongdee',  10, 62000, '2018-07-15', 1),
(3,  'Chai',     'Wongsa',    10, 55000, '2020-01-10', 1),
(4,  'Duangjai', 'Kaewmanee', 20, 70000, '2016-05-20', NULL),
(5,  'Ekkachai', 'Boonmee',   20, 45000, '2021-09-01', 4),
(6,  'Fah',      'Sukjai',    20, 48000, '2019-11-11', 4),
(7,  'Ganya',    'Prommas',   30, 52000, '2017-02-28', NULL),
(8,  'Hathai',   'Chaiyo',    30, 38000, '2022-04-04', 7),
(9,  'Itsara',   'Meesuk',    40, 90000, '2014-08-08', NULL),
(10, 'Jarin',    'Saelim',    40, 58000, '2020-06-30', 9),
(11, 'Kanok',    'Rattana',   NULL, 40000, '2023-01-16', NULL);
`;

  const library = `-- ห้องสมุด: หนังสือ / สมาชิก / การยืม
CREATE TABLE Books (
    book_id        INT PRIMARY KEY,
    title          NVARCHAR(100),
    author         NVARCHAR(100),
    year_published INT,
    genre          NVARCHAR(30)
);

INSERT INTO Books VALUES
(1, N'ข้างหลังภาพ', N'ศรีบูรพา', 1937, N'นวนิยาย'),
(2, N'สี่แผ่นดิน', N'คึกฤทธิ์ ปราโมช', 1953, N'นวนิยาย'),
(3, N'Clean Code', N'Robert C. Martin', 2008, N'คอมพิวเตอร์'),
(4, N'Database System Concepts', N'Silberschatz', 2019, N'คอมพิวเตอร์'),
(5, N'ความสุขของกะทิ', N'งามพรรณ เวชชาชีวะ', 2003, N'วรรณกรรมเยาวชน'),
(6, N'Sapiens', N'Yuval Noah Harari', 2011, N'ประวัติศาสตร์');

CREATE TABLE Members (
    member_id   INT PRIMARY KEY,
    member_name NVARCHAR(100),
    joined_date DATE
);

INSERT INTO Members VALUES
(1, N'อรุณี', '2023-05-01'), (2, N'ภานุ', '2023-08-15'), (3, N'วิภา', '2024-01-10'), (4, N'ก้องภพ', '2024-02-20');

CREATE TABLE Loans (
    loan_id     INT PRIMARY KEY,
    book_id     INT REFERENCES Books(book_id),
    member_id   INT REFERENCES Members(member_id),
    loan_date   DATE,
    return_date DATE
);

INSERT INTO Loans VALUES
(1, 1, 1, '2024-03-01', '2024-03-10'),
(2, 3, 2, '2024-03-02', NULL),
(3, 5, 1, '2024-03-05', '2024-03-12'),
(4, 4, 3, '2024-03-08', NULL),
(5, 2, 4, '2024-03-09', '2024-03-20'),
(6, 3, 1, '2024-03-15', NULL);
`;

  S.datasets = {
    shop: { id: 'shop', name: 'ร้านค้าออนไลน์', tables: ['Customers', 'Orders', 'Shippings'], sql: shop },
    continents: { id: 'continents', name: 'ทวีป', tables: ['continents'], sql: continents, dialect: 'tsql' },
    school: { id: 'school', name: 'โรงเรียน', tables: ['Students', 'Subjects', 'Scores'], sql: school },
    store: { id: 'store', name: 'ร้านสะดวกซื้อ', tables: ['Categories', 'Products', 'Sales'], sql: store },
    hr: { id: 'hr', name: 'บริษัท (HR)', tables: ['Departments', 'Employees'], sql: hr },
    library: { id: 'library', name: 'ห้องสมุด', tables: ['Books', 'Members', 'Loans'], sql: library },
  };
})(window.SBAC);
