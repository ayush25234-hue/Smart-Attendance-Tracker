const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const AUTH_SECRET = process.env.AUTH_SECRET || "change-this-secret-before-public-deployment";
const ADMIN_USERNAME = normalizeUsername(process.env.ADMIN_USERNAME || "admin");
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();
const ADMIN_NAME = String(process.env.ADMIN_NAME || "School Admin").trim();
const DATABASE_URL = process.env.DATABASE_URL || "";
const ROOT_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const DB_ROW_ID = "main";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const sampleTeachers = [
  {
    username: "mathsir",
    password: "math123",
    teacherName: "Ramesh Sharma",
    collegeName: "Smart Attendance Demo College",
    subject: "Mathematics",
    assignedClass: "10-A"
  },
  {
    username: "sciencemam",
    password: "science123",
    teacherName: "Anita Verma",
    collegeName: "Smart Attendance Demo College",
    subject: "Science",
    assignedClass: "10-B"
  },
  {
    username: "englishsir",
    password: "english123",
    teacherName: "Farhan Ali",
    collegeName: "Smart Attendance Demo College",
    subject: "English",
    assignedClass: "9-A"
  },
  {
    username: "historymam",
    password: "history123",
    teacherName: "Meera Nair",
    collegeName: "Smart Attendance Demo College",
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
    collegeName: teacher.collegeName || "",
    subject: teacher.subject,
    assignedClass: teacher.assignedClass,
    role: teacher.role || "teacher"
  };
}

function getPasswordDisplay(teacher) {
  if (teacher.password) return teacher.password;
  if (teacher.passwordDisplay) return teacher.passwordDisplay;
  if (teacher.passwordHash) return "Hidden until next successful login or admin reset";
  if (teacher.role === "admin") return "Stored in Render environment";
  return "Not available";
}

function teacherAccount(teacher) {
  return {
    ...publicTeacher(teacher),
    passwordDisplay: getPasswordDisplay(teacher)
  };
}

function demoTeacher(teacher, includePassword = false) {
  return {
    ...publicTeacher(teacher),
    ...(includePassword ? { password: teacher.password } : {})
  };
}

function adminTeacherAccount(teacher) {
  return {
    ...publicTeacher(teacher),
    passwordDisplay: getPasswordDisplay(teacher),
    canResetPassword: teacher.role !== "admin"
  };
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value) {
  return base64UrlEncode(JSON.stringify(value));
}

function signValue(value) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(value).digest("base64url");
}

function createSessionToken(teacher) {
  const payload = {
    username: teacher.username,
    role: teacher.role || "teacher",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  const encodedPayload = base64UrlJson(payload);
  return `${encodedPayload}.${signValue(encodedPayload)}`;
}

function verifySessionToken(token) {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signValue(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return req.headers["x-auth-token"] || "";
}

function isAdmin(teacher) {
  return teacher?.role === "admin";
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
  if (teacher.passwordDisplay) return teacher.passwordDisplay === password;
  if (!teacher.passwordHash || !teacher.passwordSalt) return false;
  const { hash } = hashPassword(password, teacher.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(teacher.passwordHash, "hex"));
}

let pgPool = null;

function getInitialDb() {
  return {
    teachers: [],
    classes: sampleClasses,
    classMeta: {},
    students,
    attendanceRecords: {},
    holidayRecords: {}
  };
}

function normalizeDb(db) {
  const source = db && typeof db === "object" ? db : {};
  const dbStudents = (Array.isArray(source.students) ? source.students : students).map((student) => ({
    ...student,
    fatherName: String(student.fatherName || "").trim()
  }));
  const dbClasses = Array.isArray(source.classes)
    ? source.classes
    : [...new Set(dbStudents.map((student) => student.className))].sort();

  return {
    teachers: Array.isArray(source.teachers) ? source.teachers : [],
    classes: dbClasses,
    classMeta: source.classMeta || {},
    students: dbStudents,
    attendanceRecords: source.attendanceRecords || {},
    holidayRecords: source.holidayRecords || {}
  };
}

function getPgPool() {
  if (!DATABASE_URL) return null;
  if (!pgPool) {
    let Pool;
    try {
      ({ Pool } = require("pg"));
    } catch {
      throw new Error("DATABASE_URL is set, but the pg package is not installed. Run npm install.");
    }

    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
    });
  }
  return pgPool;
}

async function ensurePostgresDb() {
  const pool = getPgPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await pool.query("SELECT id FROM app_state WHERE id = $1", [DB_ROW_ID]);
  if (!existing.rowCount) {
    await pool.query(
      "INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2::jsonb, NOW())",
      [DB_ROW_ID, JSON.stringify(getInitialDb())]
    );
  }
}

async function ensureDb() {
  if (DATABASE_URL) {
    await ensurePostgresDb();
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(getInitialDb(), null, 2));
  }
}

async function readDb() {
  await ensureDb();

  if (DATABASE_URL) {
    const pool = getPgPool();
    const result = await pool.query("SELECT data FROM app_state WHERE id = $1", [DB_ROW_ID]);
    return normalizeDb(result.rows[0]?.data || getInitialDb());
  }

  const content = await fs.readFile(DB_PATH, "utf8");
  return normalizeDb(JSON.parse(content || "{}"));
}

async function writeDb(db) {
  const normalizedDb = normalizeDb(db);

  if (DATABASE_URL) {
    const pool = getPgPool();
    await pool.query(`
      INSERT INTO app_state (id, data, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `, [DB_ROW_ID, JSON.stringify(normalizedDb)]);
    return;
  }

  await fs.writeFile(DB_PATH, JSON.stringify(normalizedDb, null, 2));
}

async function getAllTeachers() {
  const db = await readDb();
  const merged = new Map(sampleTeachers.map((teacher) => [teacher.username, { ...teacher, role: "teacher" }]));
  db.teachers.forEach((teacher) => {
    if (ADMIN_PASSWORD && teacher.username === ADMIN_USERNAME) return;
    const base = merged.get(teacher.username) || {};
    merged.set(teacher.username, { role: "teacher", ...base, ...teacher });
  });
  if (ADMIN_PASSWORD) {
    merged.set(ADMIN_USERNAME, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      teacherName: ADMIN_NAME,
      subject: "Administration",
      assignedClass: db.classes[0] || "",
      role: "admin"
    });
  }
  return [...merged.values()];
}

async function findTeacher(username) {
  const normalized = normalizeUsername(username);
  const allTeachers = await getAllTeachers();
  return allTeachers.find((teacher) => teacher.username === normalized);
}

async function requireAuth(req) {
  const payload = verifySessionToken(getBearerToken(req));
  if (!payload?.username) return null;
  const teacher = await findTeacher(payload.username);
  if (!teacher) return null;
  return teacher;
}

async function requireActor(req, res) {
  const actor = await requireAuth(req);
  if (!actor) {
    sendError(res, 401, "Login session expired. Please login again.");
    return null;
  }
  return actor;
}

function canActAs(actor, username) {
  return isAdmin(actor) || actor.username === normalizeUsername(username);
}

function canManageClass(actor, className, db) {
  const normalizedClassName = normalizeClassName(className);
  return isAdmin(actor)
    || actor.assignedClass === normalizedClassName
    || db.classMeta?.[normalizedClassName]?.createdBy === actor.username;
}

function canDeleteHoliday(actor, holiday) {
  return isAdmin(actor) || holiday?.addedBy === actor.username;
}

function upsertTeacherOverride(db, teacher, updates) {
  const index = db.teachers.findIndex((item) => item.username === teacher.username);
  const base = {
    username: teacher.username,
    teacherName: teacher.teacherName,
    collegeName: teacher.collegeName || "",
    subject: teacher.subject,
    assignedClass: teacher.assignedClass,
    role: teacher.role || "teacher"
  };
  const nextTeacher = {
    ...(index >= 0 ? db.teachers[index] : base),
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    db.teachers[index] = nextTeacher;
  } else {
    db.teachers.push(nextTeacher);
  }
}

function pruneAttendanceContainers(db) {
  Object.keys(db.attendanceRecords).forEach((dateValue) => {
    Object.keys(db.attendanceRecords[dateValue] || {}).forEach((className) => {
      if (!Object.keys(db.attendanceRecords[dateValue][className] || {}).length) {
        delete db.attendanceRecords[dateValue][className];
      }
    });
    if (!Object.keys(db.attendanceRecords[dateValue] || {}).length) {
      delete db.attendanceRecords[dateValue];
    }
  });
}

function removeStudentFromAttendance(db, studentId) {
  Object.values(db.attendanceRecords).forEach((classRecords) => {
    Object.values(classRecords || {}).forEach((subjectRecords) => {
      Object.values(subjectRecords || {}).forEach((record) => {
        if (Array.isArray(record.present)) {
          record.present = record.present.filter((id) => Number(id) !== Number(studentId));
        }
        if (Array.isArray(record.absent)) {
          record.absent = record.absent.filter((id) => Number(id) !== Number(studentId));
        }
      });
    });
  });
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
  const actor = await requireAuth(req);
  const demoTeachers = sampleTeachers.map((teacher) => demoTeacher(teacher, isAdmin(actor)));

  if (!actor) {
    sendJson(res, 200, {
      teachers: [],
      demoTeachers,
      classes: db.classes,
      students: [],
      attendanceRecords: {},
      holidayRecords: {}
    });
    return;
  }

  sendJson(res, 200, {
    teachers: (await getAllTeachers()).map(publicTeacher),
    demoTeachers,
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

  if (username === ADMIN_USERNAME && !ADMIN_PASSWORD) {
    sendError(res, 503, "Admin login is not enabled. Set ADMIN_PASSWORD in Render Environment, save, and redeploy.");
    return;
  }

  let teacher = await findTeacher(username);

  if (!teacher) {
    if (username === ADMIN_USERNAME) {
      sendError(res, 404, "Admin account is not active. Check ADMIN_PASSWORD in Render Environment and redeploy.");
      return;
    }
    sendError(res, 404, "Account not found. Create it again or ask the admin to check the username.");
    return;
  }

  if (!verifyPassword(password, teacher)) {
    if (username === ADMIN_USERNAME) {
      sendError(res, 401, "Admin password does not match ADMIN_PASSWORD in Render. Use the exact saved environment value or update it and redeploy.");
      return;
    }
    sendError(res, 401, "Wrong password. Check spaces, capital letters, or ask admin to reset it.");
    return;
  }

  if (!isAdmin(teacher) && !teacher.password && !teacher.passwordDisplay) {
    const db = await readDb();
    upsertTeacherOverride(db, teacher, {
      password,
      passwordSalt: null,
      passwordHash: null,
      passwordRecoveredAt: new Date().toISOString()
    });
    await writeDb(db);
    teacher = await findTeacher(username);
  }

  sendJson(res, 200, {
    teacher: teacherAccount(teacher),
    sessionToken: createSessionToken(teacher)
  });
}

async function handleAdminTeachers(req, res) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  if (!isAdmin(actor)) {
    sendError(res, 403, "Only the admin can view teacher credentials.");
    return;
  }

  sendJson(res, 200, {
    accounts: (await getAllTeachers()).map(adminTeacherAccount)
  });
}

async function handleAdminResetTeacherPassword(req, res, username) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  if (!isAdmin(actor)) {
    sendError(res, 403, "Only the admin can reset teacher passwords.");
    return;
  }

  const target = await findTeacher(username);
  if (!target) {
    sendError(res, 404, "Teacher account not found.");
    return;
  }

  if (isAdmin(target)) {
    sendError(res, 403, "Admin password must be changed in Render environment variables.");
    return;
  }

  const body = await readBody(req);
  const newPassword = String(body.newPassword || "");
  if (newPassword.length < 4) {
    sendError(res, 400, "Password must be at least 4 characters.");
    return;
  }

  const db = await readDb();
  upsertTeacherOverride(db, target, {
    password: newPassword,
    passwordSalt: null,
    passwordHash: null,
    passwordResetBy: actor.username,
    passwordResetAt: new Date().toISOString()
  });

  await writeDb(db);
  sendJson(res, 200, {
    accounts: (await getAllTeachers()).map(adminTeacherAccount)
  });
}

async function handleRegister(req, res) {
  const body = await readBody(req);
  const teacherName = String(body.teacherName || "").trim();
  const collegeName = String(body.collegeName || "").trim();
  const subject = String(body.subject || "").trim();
  const assignedClass = normalizeClassName(body.assignedClass);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");

  if (!teacherName || !collegeName || !subject || !assignedClass || !username || !password) {
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
  const teacher = {
    username,
    teacherName,
    collegeName,
    subject,
    assignedClass,
    role: "teacher",
    password,
    createdAt: new Date().toISOString()
  };

  db.teachers.push(teacher);
  if (!db.classes.includes(assignedClass)) {
    db.classes.push(assignedClass);
    db.classes.sort();
  }
  await writeDb(db);
  sendJson(res, 201, {
    teacher: teacherAccount(teacher),
    sessionToken: createSessionToken(teacher),
    teachers: (await getAllTeachers()).map(publicTeacher)
  });
}

async function handleTeacher(req, res, username) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  if (!canActAs(actor, username)) {
    sendError(res, 403, "You can view only your own teacher account.");
    return;
  }

  const teacher = await findTeacher(username);
  if (!teacher) {
    sendError(res, 404, "Teacher account not found.");
    return;
  }
  sendJson(res, 200, { teacher: teacherAccount(teacher) });
}

async function handleAssignTeacherClass(req, res, username) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  if (!canActAs(actor, username)) {
    sendError(res, 403, "You can change only your own dashboard class.");
    return;
  }

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
    collegeName: teacher.collegeName || "",
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
    teacher: teacherAccount(updatedTeacher),
    teachers: (await getAllTeachers()).map(publicTeacher),
    classes: db.classes
  });
}

async function handleAddClass(req, res) {
  const actor = await requireActor(req, res);
  if (!actor) return;

  const body = await readBody(req);
  const className = normalizeClassName(body.className);
  if (!canActAs(actor, body.teacherUsername)) {
    sendError(res, 403, "You can create classes only for your own account.");
    return;
  }

  const teacher = actor;
  const assignToTeacher = Boolean(body.assignToTeacher);

  if (!className) {
    sendError(res, 400, "Class name is required.");
    return;
  }

  const db = await readDb();
  if (!db.classes.includes(className)) {
    db.classes.push(className);
    db.classes.sort();
  }
  db.classMeta[className] = db.classMeta[className] || {
    createdBy: teacher.username,
    createdAt: new Date().toISOString()
  };

  if (assignToTeacher) {
    const index = db.teachers.findIndex((item) => item.username === teacher.username);
    if (index >= 0) {
      db.teachers[index] = { ...db.teachers[index], assignedClass: className, updatedAt: new Date().toISOString() };
    } else {
      db.teachers.push({
        username: teacher.username,
        teacherName: teacher.teacherName,
        collegeName: teacher.collegeName || "",
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
    teacher: teacherAccount(updatedTeacher),
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
  const fatherName = String(input.fatherName || input.father || "").trim();
  return { className, rollNo, name, fatherName };
}

async function handleAddStudent(req, res) {
  const actor = await requireActor(req, res);
  if (!actor) return;

  const body = await readBody(req);
  const studentInput = normalizeStudentInput(body, body.className);
  if (!canActAs(actor, body.teacherUsername)) {
    sendError(res, 403, "You can add students only from your own account.");
    return;
  }

  if (!studentInput.className || !studentInput.rollNo || !studentInput.name) {
    sendError(res, 400, "Class, roll number, and student name are required.");
    return;
  }

  const db = await readDb();
  if (!canManageClass(actor, studentInput.className, db)) {
    sendError(res, 403, "You can add students only to your selected class.");
    return;
  }

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
    fatherName: studentInput.fatherName,
    className: studentInput.className,
    createdBy: actor.username,
    createdAt: new Date().toISOString()
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
  const actor = await requireActor(req, res);
  if (!actor) return;

  const body = await readBody(req);
  const fallbackClassName = normalizeClassName(body.className);
  const rows = Array.isArray(body.students) ? body.students : [];
  if (!canActAs(actor, body.teacherUsername)) {
    sendError(res, 403, "You can import students only from your own account.");
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
  if (!canManageClass(actor, fallbackClassName, db)) {
    sendError(res, 403, "You can import students only to your selected class.");
    return;
  }

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
      fatherName: studentInput.fatherName,
      className: studentInput.className,
      createdBy: actor.username,
      createdAt: new Date().toISOString()
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

async function handleUpdateStudent(req, res, studentId, username) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  if (!canActAs(actor, username)) {
    sendError(res, 403, "You can edit students only from your own account.");
    return;
  }

  const body = await readBody(req);
  const db = await readDb();
  const studentIndex = db.students.findIndex((item) => Number(item.id) === Number(studentId));
  if (studentIndex < 0) {
    sendError(res, 404, "Student not found.");
    return;
  }

  const existingStudent = db.students[studentIndex];
  if (!canManageClass(actor, existingStudent.className, db)) {
    sendError(res, 403, "Only the assigned class teacher or admin can edit this student.");
    return;
  }

  const studentInput = normalizeStudentInput({ ...body, className: existingStudent.className }, existingStudent.className);
  if (!studentInput.rollNo || !studentInput.name) {
    sendError(res, 400, "Roll number and student name are required.");
    return;
  }

  const duplicate = db.students.some((student) => {
    return Number(student.id) !== Number(studentId) &&
      student.className === existingStudent.className &&
      Number(student.rollNo) === studentInput.rollNo;
  });

  if (duplicate) {
    sendError(res, 409, "A student with this roll number already exists in this class.");
    return;
  }

  db.students[studentIndex] = {
    ...existingStudent,
    rollNo: studentInput.rollNo,
    name: studentInput.name,
    fatherName: studentInput.fatherName,
    updatedBy: actor.username,
    updatedAt: new Date().toISOString()
  };

  await writeDb(db);
  sendJson(res, 200, { student: db.students[studentIndex], students: db.students });
}

async function handleSaveAttendance(req, res) {
  const actor = await requireActor(req, res);
  if (!actor) return;

  const body = await readBody(req);
  const dateValue = String(body.date || "");
  if (!canActAs(actor, body.teacherUsername)) {
    sendError(res, 403, "You can save attendance only for your own account.");
    return;
  }

  const teacher = actor;
  const absent = Array.isArray(body.absent) ? body.absent.map(Number) : [];
  const overwrite = Boolean(body.overwrite);

  if (isAdmin(teacher)) {
    sendError(res, 403, "Use a subject teacher account to save attendance.");
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
  if (existing && existing.teacherUsername !== teacher.username) {
    sendError(res, 403, "This attendance record belongs to another teacher.");
    return;
  }

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
  const actor = await requireActor(req, res);
  if (!actor) return;

  const body = await readBody(req);
  const dateValue = String(body.date || "");
  const reason = String(body.reason || "").trim();
  if (!canActAs(actor, body.addedBy)) {
    sendError(res, 403, "You can add holidays only from your own account.");
    return;
  }
  const overwrite = Boolean(body.overwrite);

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
    addedBy: actor.username,
    addedAt: new Date().toISOString()
  };

  await writeDb(db);
  sendJson(res, 200, { holidayRecords: db.holidayRecords });
}

async function handleRemoveHoliday(req, res, dateValue, username) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  if (!canActAs(actor, username)) {
    sendError(res, 403, "You can remove holidays only from your own account.");
    return;
  }

  const db = await readDb();
  if (!db.holidayRecords[dateValue]) {
    sendError(res, 404, "Holiday not found.");
    return;
  }

  if (!canDeleteHoliday(actor, db.holidayRecords[dateValue])) {
    sendError(res, 403, "Only the teacher who added this holiday or the admin can remove it.");
    return;
  }

  delete db.holidayRecords[dateValue];
  await writeDb(db);
  sendJson(res, 200, { holidayRecords: db.holidayRecords });
}

async function handleDeleteStudent(req, res, studentId, username) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  if (!canActAs(actor, username)) {
    sendError(res, 403, "You can delete students only from your own account.");
    return;
  }

  const db = await readDb();
  const student = db.students.find((item) => Number(item.id) === Number(studentId));
  if (!student) {
    sendError(res, 404, "Student not found.");
    return;
  }

  if (!canManageClass(actor, student.className, db)) {
    sendError(res, 403, "Only the assigned class teacher or admin can delete this student.");
    return;
  }

  db.students = db.students.filter((item) => Number(item.id) !== Number(studentId));
  removeStudentFromAttendance(db, studentId);
  await writeDb(db);
  sendJson(res, 200, {
    students: db.students,
    attendanceRecords: db.attendanceRecords
  });
}

async function handleDeleteAttendance(req, res, dateValue, searchParams) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  const username = searchParams.get("username");
  if (!canActAs(actor, username)) {
    sendError(res, 403, "You can delete attendance only from your own account.");
    return;
  }

  const className = normalizeClassName(searchParams.get("className") || actor.assignedClass);
  const subject = String(searchParams.get("subject") || actor.subject || "").trim();
  const db = await readDb();
  const record = db.attendanceRecords[dateValue]?.[className]?.[subject];
  if (!record) {
    sendError(res, 404, "Attendance record not found.");
    return;
  }

  if (!isAdmin(actor) && record.teacherUsername !== actor.username) {
    sendError(res, 403, "Only the subject teacher who saved this attendance or admin can delete it.");
    return;
  }

  delete db.attendanceRecords[dateValue][className][subject];
  pruneAttendanceContainers(db);
  await writeDb(db);
  sendJson(res, 200, { attendanceRecords: db.attendanceRecords });
}

async function handleDeleteClass(req, res, classNameParam, username) {
  const actor = await requireActor(req, res);
  if (!actor) return;
  if (!canActAs(actor, username)) {
    sendError(res, 403, "You can delete classes only from your own account.");
    return;
  }

  const className = normalizeClassName(classNameParam);
  const db = await readDb();
  if (!db.classes.includes(className)) {
    sendError(res, 404, "Class not found.");
    return;
  }

  if (!canManageClass(actor, className, db)) {
    sendError(res, 403, "Only the assigned class teacher or admin can delete this class.");
    return;
  }

  if (!isAdmin(actor)) {
    const hasOtherTeacherRecords = Object.values(db.attendanceRecords).some((classRecords) => {
      return Object.values(classRecords?.[className] || {}).some((record) => record.teacherUsername !== actor.username);
    });
    if (hasOtherTeacherRecords) {
      sendError(res, 403, "This class has another teacher's attendance. Ask the admin to delete it.");
      return;
    }
  }

  db.classes = db.classes.filter((item) => item !== className);
  delete db.classMeta[className];
  db.students = db.students.filter((student) => student.className !== className);
  Object.keys(db.attendanceRecords).forEach((dateValue) => {
    if (db.attendanceRecords[dateValue]?.[className]) {
      delete db.attendanceRecords[dateValue][className];
    }
  });
  pruneAttendanceContainers(db);

  const fallbackClass = db.classes[0] || "";
  const teachers = await getAllTeachers();
  teachers
    .filter((teacher) => !isAdmin(teacher) && teacher.assignedClass === className)
    .forEach((teacher) => upsertTeacherOverride(db, teacher, { assignedClass: fallbackClass }));

  await writeDb(db);
  const updatedActor = await findTeacher(actor.username);
  sendJson(res, 200, {
    classes: db.classes,
    students: db.students,
    attendanceRecords: db.attendanceRecords,
    teacher: teacherAccount(updatedActor),
    teachers: (await getAllTeachers()).map(publicTeacher)
  });
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

    if (req.method === "GET" && pathname === "/api/admin/teachers") {
      await handleAdminTeachers(req, res);
      return;
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/admin/teachers/") && pathname.endsWith("/password")) {
      const username = pathname.replace("/api/admin/teachers/", "").replace("/password", "");
      await handleAdminResetTeacherPassword(req, res, username);
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

    if (req.method === "DELETE" && pathname.startsWith("/api/classes/")) {
      const className = pathname.replace("/api/classes/", "");
      await handleDeleteClass(req, res, className, url.searchParams.get("username"));
      return;
    }

    if (req.method === "POST" && pathname === "/api/students") {
      await handleAddStudent(req, res);
      return;
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/students/")) {
      const studentId = pathname.replace("/api/students/", "");
      await handleUpdateStudent(req, res, studentId, url.searchParams.get("username"));
      return;
    }

    if (req.method === "DELETE" && pathname.startsWith("/api/students/")) {
      const studentId = pathname.replace("/api/students/", "");
      await handleDeleteStudent(req, res, studentId, url.searchParams.get("username"));
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

    if (req.method === "DELETE" && pathname.startsWith("/api/attendance/")) {
      const dateValue = pathname.replace("/api/attendance/", "");
      await handleDeleteAttendance(req, res, dateValue, url.searchParams);
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
  http.createServer(router).listen(PORT, HOST, () => {
    console.log(`Smart Attendance Tracker running at http://${HOST}:${PORT}`);
  });
});
