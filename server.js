const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const sampleTeachers = [
  {
    username: "mathsir",
    password: "math123",
    teacherName: "Ramesh Sharma",
    subject: "Mathematics",
    assignedClass: "10-A"
  },
  {
    username: "sciencemam",
    password: "science123",
    teacherName: "Anita Verma",
    subject: "Science",
    assignedClass: "10-B"
  },
  {
    username: "englishsir",
    password: "english123",
    teacherName: "Farhan Ali",
    subject: "English",
    assignedClass: "9-A"
  },
  {
    username: "historymam",
    password: "history123",
    teacherName: "Meera Nair",
    subject: "Social Science",
    assignedClass: "8-B"
  }
];

const students = [
  { id: 1, rollNo: 1, name: "Aanya Sharma", className: "10-A" },
  { id: 2, rollNo: 2, name: "Rohan Mehta", className: "10-A" },
  { id: 3, rollNo: 3, name: "Ishita Rao", className: "10-A" },
  { id: 4, rollNo: 4, name: "Kabir Singh", className: "10-A" },
  { id: 5, rollNo: 5, name: "Meera Joshi", className: "10-A" },
  { id: 6, rollNo: 6, name: "Vivaan Patel", className: "10-A" },
  { id: 7, rollNo: 7, name: "Sara Khan", className: "10-A" },
  { id: 8, rollNo: 8, name: "Arjun Nair", className: "10-A" },
  { id: 9, rollNo: 9, name: "Nandini Bhat", className: "10-A" },
  { id: 10, rollNo: 10, name: "Om Prakash", className: "10-A" },
  { id: 11, rollNo: 11, name: "Pooja Sethi", className: "10-A" },
  { id: 12, rollNo: 12, name: "Yuvraj Desai", className: "10-A" },
  { id: 101, rollNo: 1, name: "Aditya Verma", className: "10-B" },
  { id: 102, rollNo: 2, name: "Diya Kapoor", className: "10-B" },
  { id: 103, rollNo: 3, name: "Kunal Das", className: "10-B" },
  { id: 104, rollNo: 4, name: "Nisha Iyer", className: "10-B" },
  { id: 105, rollNo: 5, name: "Pranav Gupta", className: "10-B" },
  { id: 106, rollNo: 6, name: "Tara Sen", className: "10-B" },
  { id: 107, rollNo: 7, name: "Yash Malhotra", className: "10-B" },
  { id: 108, rollNo: 8, name: "Zoya Ali", className: "10-B" },
  { id: 109, rollNo: 9, name: "Amit Sinha", className: "10-B" },
  { id: 110, rollNo: 10, name: "Leela Roy", className: "10-B" },
  { id: 201, rollNo: 1, name: "Aarav Reddy", className: "9-A" },
  { id: 202, rollNo: 2, name: "Anika Thomas", className: "9-A" },
  { id: 203, rollNo: 3, name: "Devika Menon", className: "9-A" },
  { id: 204, rollNo: 4, name: "Harsh Kapoor", className: "9-A" },
  { id: 205, rollNo: 5, name: "Neel Shah", className: "9-A" },
  { id: 206, rollNo: 6, name: "Priya Nair", className: "9-A" },
  { id: 207, rollNo: 7, name: "Reyansh Bose", className: "9-A" },
  { id: 208, rollNo: 8, name: "Saanvi Roy", className: "9-A" },
  { id: 301, rollNo: 1, name: "Bhavya Jain", className: "8-B" },
  { id: 302, rollNo: 2, name: "Chirag Rao", className: "8-B" },
  { id: 303, rollNo: 3, name: "Esha Pillai", className: "8-B" },
  { id: 304, rollNo: 4, name: "Gaurav Mishra", className: "8-B" },
  { id: 305, rollNo: 5, name: "Ira Saxena", className: "8-B" },
  { id: 306, rollNo: 6, name: "Manav Khanna", className: "8-B" },
  { id: 307, rollNo: 7, name: "Ritika Ghosh", className: "8-B" },
  { id: 308, rollNo: 8, name: "Samarth Kulkarni", className: "8-B" }
];

const sampleClasses = [...new Set(students.map((student) => student.className))].sort();

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeClassName(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function publicTeacher(teacher) {
  return {
    username: teacher.username,
    teacherName: teacher.teacherName,
    subject: teacher.subject,
    assignedClass: teacher.assignedClass
  };
}

function isSunday(dateValue) {
  const [year, month, day] = String(dateValue || "").split("-").map(Number);
  if (!year || !month || !day) return false;
  return new Date(year, month - 1, day).getDay() === 0;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, teacher) {
  if (teacher.password) return teacher.password === password;
  if (!teacher.passwordHash || !teacher.passwordSalt) return false;
  const { hash } = hashPassword(password, teacher.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(teacher.passwordHash, "hex"));
}

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({
      teachers: [],
      classes: sampleClasses,
      students,
      attendanceRecords: {},
      holidayRecords: {}
    }, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  const content = await fs.readFile(DB_PATH, "utf8");
  const db = JSON.parse(content || "{}");
  const dbStudents = Array.isArray(db.students) ? db.students : students;
  const dbClasses = Array.isArray(db.classes)
    ? db.classes
    : [...new Set(dbStudents.map((student) => student.className))].sort();
  return {
    teachers: Array.isArray(db.teachers) ? db.teachers : [],
    classes: dbClasses,
    students: dbStudents,
    attendanceRecords: db.attendanceRecords || {},
    holidayRecords: db.holidayRecords || {}
  };
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

async function getAllTeachers() {
  const db = await readDb();
  const merged = new Map(sampleTeachers.map((teacher) => [teacher.username, { ...teacher }]));
  db.teachers.forEach((teacher) => {
    const base = merged.get(teacher.username) || {};
    merged.set(teacher.username, { ...base, ...teacher });
  });
  return [...merged.values()];
}

async function findTeacher(username) {
  const normalized = normalizeUsername(username);
  const allTeachers = await getAllTeachers();
  return allTeachers.find((teacher) => teacher.username === normalized);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) {
      throw new Error("Request body is too large.");
    }
  }
  return body ? JSON.parse(body) : {};
}

async function handleBootstrap(req, res) {
  const db = await readDb();
  sendJson(res, 200, {
    teachers: (await getAllTeachers()).map(publicTeacher),
    demoTeachers: sampleTeachers.map((teacher) => ({
      ...publicTeacher(teacher),
      password: teacher.password
    })),
    classes: db.classes,
    students: db.students,
    attendanceRecords: db.attendanceRecords,
    holidayRecords: db.holidayRecords
  });
}

async function handleLogin(req, res) {
  const body = await readBody(req);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");
  const teacher = await findTeacher(username);

  if (!teacher || !verifyPassword(password, teacher)) {
    sendError(res, 401, "Wrong username or password.");
    return;
  }

  sendJson(res, 200, { teacher: publicTeacher(teacher) });
}

async function handleRegister(req, res) {
  const body = await readBody(req);
  const teacherName = String(body.teacherName || "").trim();
  const subject = String(body.subject || "").trim();
  const assignedClass = normalizeClassName(body.assignedClass);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");

  if (!teacherName || !subject || !assignedClass || !username || !password) {
    sendError(res, 400, "Please fill every field.");
    return;
  }

  if (password.length < 4) {
    sendError(res, 400, "Password must be at least 4 characters.");
    return;
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    sendError(res, 400, "Username can use letters, numbers, dots, hyphens, and underscores only.");
    return;
  }

  const existing = await findTeacher(username);
  if (existing) {
    sendError(res, 409, "That username already exists. Choose another username.");
    return;
  }

  const db = await readDb();
  const { salt, hash } = hashPassword(password);
  const teacher = {
    username,
    teacherName,
    subject,
    assignedClass,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString()
  };

  db.teachers.push(teacher);
  if (!db.classes.includes(assignedClass)) {
    db.classes.push(assignedClass);
    db.classes.sort();
  }
  await writeDb(db);
  sendJson(res, 201, {
    teacher: publicTeacher(teacher),
    teachers: (await getAllTeachers()).map(publicTeacher)
  });
}

async function handleTeacher(req, res, username) {
  const teacher = await findTeacher(username);
  if (!teacher) {
    sendError(res, 404, "Teacher account not found.");
    return;
  }
  sendJson(res, 200, { teacher: publicTeacher(teacher) });
}

async function handleAssignTeacherClass(req, res, username) {
  const body = await readBody(req);
  const assignedClass = normalizeClassName(body.assignedClass);
  const teacher = await findTeacher(username);

  if (!teacher) {
    sendError(res, 404, "Teacher account not found.");
    return;
  }

  if (!assignedClass) {
    sendError(res, 400, "Class name is required.");
    return;
  }

  const db = await readDb();
  const index = db.teachers.findIndex((item) => item.username === teacher.username);
  const override = {
    username: teacher.username,
    teacherName: teacher.teacherName,
    subject: teacher.subject,
    assignedClass,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    db.teachers[index] = { ...db.teachers[index], assignedClass, updatedAt: override.updatedAt };
  } else {
    db.teachers.push(override);
  }

  if (!db.classes.includes(assignedClass)) {
    db.classes.push(assignedClass);
    db.classes.sort();
  }

  await writeDb(db);
  const updatedTeacher = await findTeacher(username);
  sendJson(res, 200, {
    teacher: publicTeacher(updatedTeacher),
    teachers: (await getAllTeachers()).map(publicTeacher),
    classes: db.classes
  });
}

async function handleAddClass(req, res) {
  const body = await readBody(req);
  const className = normalizeClassName(body.className);
  const teacher = await findTeacher(body.teacherUsername);
  const assignToTeacher = Boolean(body.assignToTeacher);

  if (!teacher) {
    sendError(res, 401, "Teacher account not found.");
    return;
  }

  if (!className) {
    sendError(res, 400, "Class name is required.");
    return;
  }

  const db = await readDb();
  if (!db.classes.includes(className)) {
    db.classes.push(className);
    db.classes.sort();
  }

  if (assignToTeacher) {
    const index = db.teachers.findIndex((item) => item.username === teacher.username);
    if (index >= 0) {
      db.teachers[index] = { ...db.teachers[index], assignedClass: className, updatedAt: new Date().toISOString() };
    } else {
      db.teachers.push({
        username: teacher.username,
        teacherName: teacher.teacherName,
        subject: teacher.subject,
        assignedClass: className,
        updatedAt: new Date().toISOString()
      });
    }
  }

  await writeDb(db);
  const updatedTeacher = await findTeacher(teacher.username);
  sendJson(res, 200, {
    classes: db.classes,
    teacher: publicTeacher(updatedTeacher),
    teachers: (await getAllTeachers()).map(publicTeacher)
  });
}

function getNextStudentId(studentList) {
  const maxId = studentList.reduce((max, student) => Math.max(max, Number(student.id) || 0), 0);
  return maxId + 1;
}

function normalizeStudentInput(input, fallbackClassName) {
  const className = normalizeClassName(input.className || fallbackClassName);
  const rollNo = Number(input.rollNo);
  const name = String(input.name || "").trim();
  return { className, rollNo, name };
}

async function handleAddStudent(req, res) {
  const body = await readBody(req);
  const teacher = await findTeacher(body.teacherUsername);
  const studentInput = normalizeStudentInput(body, body.className);

  if (!teacher) {
    sendError(res, 401, "Teacher account not found.");
    return;
  }

  if (!studentInput.className || !studentInput.rollNo || !studentInput.name) {
    sendError(res, 400, "Class, roll number, and student name are required.");
    return;
  }

  const db = await readDb();
  const duplicate = db.students.some((student) => {
    return student.className === studentInput.className && Number(student.rollNo) === studentInput.rollNo;
  });

  if (duplicate) {
    sendError(res, 409, "A student with this roll number already exists in this class.");
    return;
  }

  const student = {
    id: getNextStudentId(db.students),
    rollNo: studentInput.rollNo,
    name: studentInput.name,
    className: studentInput.className
  };

  db.students.push(student);
  if (!db.classes.includes(student.className)) {
    db.classes.push(student.className);
    db.classes.sort();
  }

  await writeDb(db);
  sendJson(res, 201, { student, students: db.students, classes: db.classes });
}

async function handleImportStudents(req, res) {
  const body = await readBody(req);
  const teacher = await findTeacher(body.teacherUsername);
  const fallbackClassName = normalizeClassName(body.className);
  const rows = Array.isArray(body.students) ? body.students : [];

  if (!teacher) {
    sendError(res, 401, "Teacher account not found.");
    return;
  }

  if (!fallbackClassName) {
    sendError(res, 400, "Select a class before importing students.");
    return;
  }

  if (!rows.length) {
    sendError(res, 400, "No students found in the uploaded sheet.");
    return;
  }

  const db = await readDb();
  let nextId = getNextStudentId(db.students);
  let imported = 0;
  let skipped = 0;
  const seen = new Set(db.students.map((student) => `${student.className}::${Number(student.rollNo)}`));

  rows.forEach((row) => {
    const studentInput = normalizeStudentInput(row, fallbackClassName);
    const key = `${studentInput.className}::${studentInput.rollNo}`;

    if (!studentInput.className || !studentInput.rollNo || !studentInput.name || seen.has(key)) {
      skipped += 1;
      return;
    }

    db.students.push({
      id: nextId,
      rollNo: studentInput.rollNo,
      name: studentInput.name,
      className: studentInput.className
    });
    nextId += 1;
    imported += 1;
    seen.add(key);

    if (!db.classes.includes(studentInput.className)) {
      db.classes.push(studentInput.className);
    }
  });

  db.classes.sort();
  await writeDb(db);
  sendJson(res, 200, { imported, skipped, students: db.students, classes: db.classes });
}

async function handleSaveAttendance(req, res) {
  const body = await readBody(req);
  const dateValue = String(body.date || "");
  const teacher = await findTeacher(body.teacherUsername);
  const absent = Array.isArray(body.absent) ? body.absent.map(Number) : [];
  const overwrite = Boolean(body.overwrite);

  if (!teacher) {
    sendError(res, 401, "Teacher account not found.");
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    sendError(res, 400, "Select a valid date.");
    return;
  }

  const db = await readDb();
  if (isSunday(dateValue)) {
    sendError(res, 400, "No class scheduled on Sunday. Attendance will not be counted.");
    return;
  }

  if (db.holidayRecords[dateValue]) {
    sendError(res, 400, "This date is marked as a holiday. Attendance will not be counted.");
    return;
  }

  const classStudents = db.students.filter((student) => student.className === teacher.assignedClass);
  if (!classStudents.length) {
    sendError(res, 400, "No students found for this class.");
    return;
  }

  const studentIds = new Set(classStudents.map((student) => student.id));
  const cleanAbsent = [...new Set(absent)].filter((id) => studentIds.has(id));
  const absentSet = new Set(cleanAbsent);
  const present = classStudents
    .filter((student) => !absentSet.has(student.id))
    .map((student) => student.id);

  const existing = db.attendanceRecords[dateValue]?.[teacher.assignedClass]?.[teacher.subject];
  if (existing && !overwrite) {
    sendJson(res, 409, { error: "Attendance already exists.", duplicate: true });
    return;
  }

  db.attendanceRecords[dateValue] = db.attendanceRecords[dateValue] || {};
  db.attendanceRecords[dateValue][teacher.assignedClass] = db.attendanceRecords[dateValue][teacher.assignedClass] || {};
  db.attendanceRecords[dateValue][teacher.assignedClass][teacher.subject] = {
    teacherUsername: teacher.username,
    present,
    absent: cleanAbsent,
    savedAt: new Date().toISOString()
  };

  await writeDb(db);
  sendJson(res, 200, {
    record: db.attendanceRecords[dateValue][teacher.assignedClass][teacher.subject],
    attendanceRecords: db.attendanceRecords
  });
}

async function handleAddHoliday(req, res) {
  const body = await readBody(req);
  const dateValue = String(body.date || "");
  const reason = String(body.reason || "").trim();
  const teacher = await findTeacher(body.addedBy);
  const overwrite = Boolean(body.overwrite);

  if (!teacher) {
    sendError(res, 401, "Teacher account not found.");
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !reason) {
    sendError(res, 400, "Select a holiday date and add a reason.");
    return;
  }

  const db = await readDb();
  if (db.holidayRecords[dateValue] && !overwrite) {
    sendJson(res, 409, { error: "Holiday already exists.", duplicate: true });
    return;
  }

  db.holidayRecords[dateValue] = {
    reason,
    addedBy: teacher.username,
    addedAt: new Date().toISOString()
  };

  await writeDb(db);
  sendJson(res, 200, { holidayRecords: db.holidayRecords });
}

async function handleRemoveHoliday(req, res, dateValue, username) {
  const teacher = await findTeacher(username);
  if (!teacher) {
    sendError(res, 401, "Teacher account not found.");
    return;
  }

  const db = await readDb();
  if (!db.holidayRecords[dateValue]) {
    sendError(res, 404, "Holiday not found.");
    return;
  }

  delete db.holidayRecords[dateValue];
  await writeDb(db);
  sendJson(res, 200, { holidayRecords: db.holidayRecords });
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT_DIR, safePath));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendError(res, 403, "Forbidden.");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    };
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    sendError(res, 404, "Not found.");
  }
}

async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/bootstrap") {
      await handleBootstrap(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/login") {
      await handleLogin(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/register") {
      await handleRegister(req, res);
      return;
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/teachers/") && pathname.endsWith("/class")) {
      const username = pathname.replace("/api/teachers/", "").replace("/class", "");
      await handleAssignTeacherClass(req, res, username);
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/teachers/")) {
      await handleTeacher(req, res, pathname.replace("/api/teachers/", ""));
      return;
    }

    if (req.method === "POST" && pathname === "/api/classes") {
      await handleAddClass(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/students") {
      await handleAddStudent(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/students/import") {
      await handleImportStudents(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/attendance") {
      await handleSaveAttendance(req, res);
      return;
    }

    if (req.method === "POST" && pathname === "/api/holidays") {
      await handleAddHoliday(req, res);
      return;
    }

    if (req.method === "DELETE" && pathname.startsWith("/api/holidays/")) {
      const dateValue = pathname.replace("/api/holidays/", "");
      await handleRemoveHoliday(req, res, dateValue, url.searchParams.get("username"));
      return;
    }

    if (pathname.startsWith("/api/")) {
      sendError(res, 404, "API route not found.");
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    sendError(res, 500, error.message || "Server error.");
  }
}

ensureDb().then(() => {
  http.createServer(router).listen(PORT, () => {
    console.log(`Smart Attendance Tracker running at http://localhost:${PORT}`);
  });
});
