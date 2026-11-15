process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";

import http from "node:http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { app } = await import("../src/server.js");
const Staff = (await import("../src/models/Staff.js")).default;
const Patient = (await import("../src/models/Patient.js")).default;
const Department = (await import("../src/models/Department.js")).default;
const Doctor = (await import("../src/models/Doctor.js")).default;
const DoctorSchedule = (await import("../src/models/DoctorSchedule.js")).default;
const Appointment = (await import("../src/models/Appointment.js")).default;

Department.find = () => ({
  sort: async () => [
    { _id: "607f1f77bcf86cd799439100", name: "Cardiology", isActive: true }
  ]
});

Doctor.find = () => ({
  populate: () => ({
    sort: async () => [
      { _id: "607f1f77bcf86cd799439200", name: "Dr. Smith", specialization: "Cardiology", isActive: true }
    ]
  })
});

DoctorSchedule.find = () => ({
  populate: () => ({
    sort: async () => [
      { _id: "607f1f77bcf86cd799439300", dayOfWeek: "Monday", isActive: true }
    ]
  })
});

Appointment.find = () => ({
  populate: () => ({
    populate: () => ({
      populate: () => ({
        sort: async () => []
      }),
      sort: async () => []
    }),
    sort: async () => []
  }),
  sort: async () => []
});

const server = http.createServer(app).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const results = [];
const t = async (name, p, expect) => {
  const [status, body] = await p;
  const ok = status === expect;
  results.push(ok);
  console.log(ok ? "PASS" : "FAIL", name, "->", status, body?.message || "");
};

const call = async (path, { method = "GET", token, body, raw } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(base + path, {
    method,
    headers,
    body: raw ?? (body ? JSON.stringify(body) : undefined)
  });
  let j = {};
  try {
    j = await r.json();
  } catch {}
  return [r.status, j];
};

// Mock in-memory patient database for tests
const mockPatients = [];
const mockStaff = [
  {
    _id: "607f1f77bcf86cd799439001",
    staffId: "STF-001",
    name: "Staff Admin",
    email: "admin@hospital.com",
    password: await bcrypt.hash("adminpassword123", 10),
    role: "admin",
    isActive: true
  }
];

// Stub Mongoose model methods
Staff.findOne = async (query) => {
  if (query.email) {
    return mockStaff.find((s) => s.email === query.email && (query.isActive === undefined || s.isActive === query.isActive)) || null;
  }
  return null;
};

Staff.findById = (id) => ({
  select: async () => mockStaff.find((s) => s._id === id) || null
});

Patient.findOne = async (query) => {
  if (query.email) {
    return mockPatients.find((p) => p.email === query.email && (query.isActive === undefined || p.isActive === query.isActive)) || null;
  }
  if (query._id) {
    return mockPatients.find((p) => p._id === query._id && (query.isActive === undefined || p.isActive === query.isActive)) || null;
  }
  return null;
};

Patient.findById = (id) => ({
  select: async () => mockPatients.find((p) => p._id === id) || null
});

Patient.create = async (data) => {
  const created = {
    _id: `607f1f77bcf86cd7994390${mockPatients.length + 10}`,
    ...data,
    isActive: true
  };
  mockPatients.push(created);
  return created;
};

console.log("=== Testing Client Registration Validations ===");

// 1. Missing required fields
await t(
  "client register missing fields",
  call("/api/auth/client/register", {
    method: "POST",
    body: { name: "John" }
  }),
  400
);

// 2. Invalid email format
await t(
  "client register invalid email",
  call("/api/auth/client/register", {
    method: "POST",
    body: {
      name: "John Doe",
      email: "not-an-email",
      phone: "+1234567890",
      password: "password123",
      confirmPassword: "password123",
      dateOfBirth: "1995-05-15",
      gender: "Male",
      address: "123 Main St"
    }
  }),
  400
);

// 3. Invalid phone format
await t(
  "client register invalid phone",
  call("/api/auth/client/register", {
    method: "POST",
    body: {
      name: "John Doe",
      email: "john@example.com",
      phone: "123",
      password: "password123",
      confirmPassword: "password123",
      dateOfBirth: "1995-05-15",
      gender: "Male",
      address: "123 Main St"
    }
  }),
  400
);

// 4. Password < 8 chars
await t(
  "client register short password",
  call("/api/auth/client/register", {
    method: "POST",
    body: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      password: "short",
      confirmPassword: "short",
      dateOfBirth: "1995-05-15",
      gender: "Male",
      address: "123 Main St"
    }
  }),
  400
);

// 5. Password mismatch
await t(
  "client register password mismatch",
  call("/api/auth/client/register", {
    method: "POST",
    body: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      password: "password123",
      confirmPassword: "differentpassword",
      dateOfBirth: "1995-05-15",
      gender: "Male",
      address: "123 Main St"
    }
  }),
  400
);

// 6. Future Date of Birth
await t(
  "client register future DOB",
  call("/api/auth/client/register", {
    method: "POST",
    body: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      password: "password123",
      confirmPassword: "password123",
      dateOfBirth: "2099-01-01",
      gender: "Male",
      address: "123 Main St"
    }
  }),
  400
);

// 7. Invalid gender
await t(
  "client register invalid gender",
  call("/api/auth/client/register", {
    method: "POST",
    body: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      password: "password123",
      confirmPassword: "password123",
      dateOfBirth: "1995-05-15",
      gender: "Unknown",
      address: "123 Main St"
    }
  }),
  400
);

// 8. Duplicate email with existing staff
await t(
  "client register duplicate email (matches staff)",
  call("/api/auth/client/register", {
    method: "POST",
    body: {
      name: "Admin Impersonator",
      email: "admin@hospital.com",
      phone: "+1234567890",
      password: "password123",
      confirmPassword: "password123",
      dateOfBirth: "1995-05-15",
      gender: "Male",
      address: "123 Main St"
    }
  }),
  409
);

// 9. Successful client registration (with role manipulation attempt: role: "admin")
const [regStatus, regBody] = await call("/api/auth/client/register", {
  method: "POST",
  body: {
    name: "Jane Patient",
    email: "jane.patient@example.com",
    phone: "+1-555-0199",
    password: "securepassword123",
    confirmPassword: "securepassword123",
    dateOfBirth: "1992-08-20",
    gender: "Female",
    address: "456 Oak Avenue, Cityville",
    bloodGroup: "O+",
    role: "admin" // malicious attempt to escalate privileges
  }
});

const regOk =
  regStatus === 201 &&
  regBody.success === true &&
  Boolean(regBody.token) &&
  regBody.data.role === "client" && // strictly assigned client!
  regBody.data.email === "jane.patient@example.com" &&
  Boolean(regBody.data.patientId);

results.push(regOk);
console.log(
  regOk ? "PASS" : "FAIL",
  "client registration successful with role client",
  "->",
  regStatus,
  `Assigned role: ${regBody.data?.role}`
);

// 10. Duplicate client registration with same email
await t(
  "client register duplicate email (matches registered patient)",
  call("/api/auth/client/register", {
    method: "POST",
    body: {
      name: "Jane Patient 2",
      email: "jane.patient@example.com",
      phone: "+1-555-0200",
      password: "securepassword123",
      confirmPassword: "securepassword123",
      dateOfBirth: "1992-08-20",
      gender: "Female",
      address: "456 Oak Avenue"
    }
  }),
  409
);

console.log("=== Testing Client Login & Session ===");

// 11. Client login with wrong password
await t(
  "client login wrong password",
  call("/api/auth/login", {
    method: "POST",
    body: {
      email: "jane.patient@example.com",
      password: "wrongpassword"
    }
  }),
  401
);

// 12. Client login with valid credentials
const [loginStatus, loginBody] = await call("/api/auth/login", {
  method: "POST",
  body: {
    email: "jane.patient@example.com",
    password: "securepassword123"
  }
});

const loginOk =
  loginStatus === 200 &&
  loginBody.success === true &&
  Boolean(loginBody.token) &&
  loginBody.data.role === "client";

results.push(loginOk);
console.log(loginOk ? "PASS" : "FAIL", "client login success", "->", loginStatus);

const clientToken = loginBody.token;

// 13. Access /api/auth/me with client token
const [meStatus, meBody] = await call("/api/auth/me", {
  token: clientToken
});

const meOk =
  meStatus === 200 &&
  meBody.success === true &&
  meBody.data.role === "client" &&
  meBody.data.email === "jane.patient@example.com";

results.push(meOk);
console.log(meOk ? "PASS" : "FAIL", "client getMe profile", "->", meStatus);

console.log("=== Testing Role-Based Route Authorization ===");

// 14. Client cannot access staff routes (/api/patients)
await t(
  "client denied access to /api/patients",
  call("/api/patients", { token: clientToken }),
  403
);

// 15. Client cannot access /api/audit-logs
await t(
  "client denied access to /api/audit-logs",
  call("/api/audit-logs", { token: clientToken }),
  403
);

// 16. Client cannot register staff accounts
await t(
  "client denied access to /api/auth/register (staff)",
  call("/api/auth/register", { method: "POST", token: clientToken, body: {} }),
  403
);

// 17. Client CAN access /api/departments
const [deptStatus] = await call("/api/departments", { token: clientToken });
const deptOk = deptStatus === 200;
results.push(deptOk);
console.log(deptOk ? "PASS" : "FAIL", "client allowed on /api/departments", "->", deptStatus);

// 18. Client CAN access /api/doctors
const [docStatus] = await call("/api/doctors", { token: clientToken });
const docOk = docStatus === 200;
results.push(docOk);
console.log(docOk ? "PASS" : "FAIL", "client allowed on /api/doctors", "->", docStatus);

// 19. Client CAN access /api/schedules
const [schedStatus] = await call("/api/schedules", { token: clientToken });
const schedOk = schedStatus === 200;
results.push(schedOk);
console.log(schedOk ? "PASS" : "FAIL", "client allowed on /api/schedules", "->", schedStatus);

// 20. Staff token (e.g., frontDesk) CANNOT access client-only routes (/api/appointments/my)
const frontDeskToken = jwt.sign(
  { id: "607f1f77bcf86cd799439001", role: "frontDesk" },
  process.env.JWT_SECRET
);
await t(
  "frontDesk denied on client /api/appointments/my",
  call("/api/appointments/my", { token: frontDeskToken }),
  403
);

console.log("\n=================================");
const total = results.length;
const passed = results.filter(Boolean).length;
console.log(
  passed === total ? `ALL PASSED (${passed}/${total})` : `SOME FAILED (${passed}/${total})`
);
server.close();
process.exit(passed === total ? 0 : 1);
