import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { db, auth, isMock } from './firebaseAdmin.js';
import {
  DEMO_ADMIN,
  DEMO_FACULTY,
  DEMO_STUDENTS,
  DEMO_COURSES,
  INITIAL_SECTIONS_CONFIG,
  INITIAL_ASSIGNMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_MARKS,
  DEMO_PASSWORD,
} from './seedData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory store for offline mock mode or fallback
const mockStore = {
  users: new Map(),
  students: new Map(), // key: normalized USN
  faculty: new Map(),
  courses: new Map(), // key: course code (8 active courses)
  assignments: new Map(),
  attendance: new Map(),
  marks: new Map(),
  sectionsConfig: { ...INITIAL_SECTIONS_CONFIG },
};

// Seed initial mock data
function seedInMemoryStore() {
  // Admin
  mockStore.users.set(DEMO_ADMIN.uid, { ...DEMO_ADMIN });

  // Faculty (8 Fictional Faculty Profiles)
  for (const f of DEMO_FACULTY) {
    mockStore.users.set(f.uid, { ...f });
    mockStore.faculty.set(f.uid, { ...f });
  }

  // Courses (8 Fictional Courses for AIML Year 3 Sections A, B, C)
  for (const c of DEMO_COURSES) {
    mockStore.courses.set(c.code, { ...c });
  }

  // 30 Fictional Students
  for (const s of DEMO_STUDENTS) {
    mockStore.users.set(s.uid, { ...s });
    mockStore.students.set(s.usn, { ...s });
  }

  // Assignments
  for (const a of INITIAL_ASSIGNMENTS) {
    mockStore.assignments.set(a.id, { ...a });
  }

  // Attendance
  for (const att of INITIAL_ATTENDANCE) {
    mockStore.attendance.set(att.id, { ...att });
  }

  // Marks
  for (const m of INITIAL_MARKS) {
    mockStore.marks.set(m.id, { ...m });
  }

  console.log(`[Seed] In-memory store seeded: 1 admin, ${DEMO_FACULTY.length} faculty, ${DEMO_COURSES.length} courses, ${DEMO_STUDENTS.length} students (AIML Year 3 sections A, B, C)`);
}

// Seed on startup
seedInMemoryStore();

// Admin verification middleware
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing.' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (isMock) {
    // Check if token corresponds to admin in mockStore
    const user = mockStore.users.get(token) || Array.from(mockStore.users.values()).find(u => u.email === token);
    if (!user || user.role !== 'admin' || user.status !== 'active') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
    }
    req.currentUser = user;
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin' || userDoc.data().status !== 'active') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
    }
    req.currentUser = userDoc.data();
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid authentication token: ' + err.message });
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Health / Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isMock ? 'mock-offline' : 'firebase',
    studentCount: isMock ? mockStore.students.size : 'dynamic',
    facultyCount: isMock ? mockStore.faculty.size : 'dynamic',
  });
});

// Seed endpoint
app.post('/api/seed', async (req, res) => {
  try {
    seedInMemoryStore();

    // Protect live Firebase data: update in-memory / local seed store only
    if (!isMock) {
      console.log('[Seed] Live Firebase database detected. Skipping cloud database write to protect real records.');
    }

    res.json({
      success: true,
      message: 'Successfully seeded directory data (30 student records, 8 courses, 8 faculty profiles, and administrator).',
      courseCount: DEMO_COURSES.length,
      facultyCount: DEMO_FACULTY.length,
      credentials: {
        admin: { email: DEMO_ADMIN.email, password: DEMO_PASSWORD },
        sampleStudent: { email: DEMO_STUDENTS[0].email, usn: DEMO_STUDENTS[0].usn, password: DEMO_PASSWORD },
      },
    });
  } catch (err) {
    console.error('Seeding error:', err);
    res.status(500).json({ error: 'Failed to seed database: ' + err.message });
  }
});

// Config: Get Sections & Departments
app.get('/api/sections-config', async (req, res) => {
  if (isMock) {
    return res.json(mockStore.sectionsConfig);
  }
  try {
    const doc = await db.collection('sectionsConfig').doc('default').get();
    if (doc.exists) {
      return res.json(doc.data());
    }
    return res.json(INITIAL_SECTIONS_CONFIG);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Courses Catalog Endpoint
app.get('/api/courses', (req, res) => {
  const { department, year, section } = req.query;
  if (isMock) {
    let list = Array.from(mockStore.courses.values());
    if (department) list = list.filter(c => c.department === department);
    if (year) list = list.filter(c => c.year === Number(year));
    if (section) list = list.filter(c => c.sections && c.sections.includes(section));
    return res.json(list);
  }
  let query = db.collection('courses');
  if (department) query = query.where('department', '==', department);
  if (year) query = query.where('year', '==', Number(year));
  query.get()
    .then(snapshot => {
      let list = snapshot.docs.map(d => d.data());
      if (section) list = list.filter(c => c.sections && c.sections.includes(section));
      res.json(list);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// Config: Update Sections (Admin only)
app.put('/api/sections-config', requireAdmin, async (req, res) => {
  const { sectionsByDeptYear } = req.body;
  if (!sectionsByDeptYear || typeof sectionsByDeptYear !== 'object') {
    return res.status(400).json({ error: 'Invalid sections configuration format.' });
  }

  const updatedConfig = {
    ...INITIAL_SECTIONS_CONFIG,
    sectionsByDeptYear,
  };

  if (isMock) {
    mockStore.sectionsConfig = updatedConfig;
    return res.json({ success: true, config: updatedConfig });
  }

  try {
    await db.collection('sectionsConfig').doc('default').set(updatedConfig, { merge: true });
    res.json({ success: true, config: updatedConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Directory (Admin)
app.get('/api/students', requireAdmin, async (req, res) => {
  if (isMock) {
    return res.json(Array.from(mockStore.students.values()));
  }
  try {
    const snapshot = await db.collection('students').get();
    const list = snapshot.docs.map(doc => doc.data());
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Student (Admin - Secure server-side operation)
app.post('/api/students', requireAdmin, async (req, res) => {
  const { name, usn, department, year, section, email, phone } = req.body;

  // 1. Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Student name is required.' });
  }
  if (!usn || !usn.trim()) {
    return res.status(400).json({ error: 'USN is required.' });
  }
  if (!email || !email.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid college email is required.' });
  }
  if (!department) {
    return res.status(400).json({ error: 'Department is required.' });
  }
  const parsedYear = Number(year);
  if (!parsedYear || parsedYear < 1 || parsedYear > 4) {
    return res.status(400).json({ error: 'Year must be between 1 and 4.' });
  }
  if (!section || !section.trim()) {
    return res.status(400).json({ error: 'Section is required.' });
  }

  // 2. USN normalization
  const normalizedUSN = usn.trim().toUpperCase();

  // 3. Database uniqueness enforcement
  if (isMock) {
    if (mockStore.students.has(normalizedUSN)) {
      return res.status(409).json({ error: `USN ${normalizedUSN} is already registered in the system.` });
    }

    const uid = 'stu-' + crypto.randomUUID();
    const newStudent = {
      usn: normalizedUSN,
      uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      department,
      year: parsedYear,
      section: section.trim().toUpperCase(),
      role: 'student',
      status: 'active',
      isDemo: false,
      createdAt: new Date().toISOString(),
    };

    mockStore.students.set(normalizedUSN, newStudent);
    mockStore.users.set(uid, newStudent);

    return res.status(201).json({
      success: true,
      student: newStudent,
      message: `Student account created for ${normalizedUSN}. First-time password setup instructions sent to ${newStudent.email}.`,
    });
  }

  // Real Firebase Admin SDK execution with Firestore Transaction
  try {
    const studentRef = db.collection('students').doc(normalizedUSN);

    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(studentRef);
      if (doc.exists) {
        throw new Error(`USN_EXISTS:${normalizedUSN}`);
      }

      // Create Firebase Auth User
      // Generate secure temporary random password for first login (never stored in DB)
      const tempPassword = 'Edu' + crypto.randomBytes(6).toString('hex') + '!';
      const userRecord = await auth.createUser({
        email: email.trim().toLowerCase(),
        password: tempPassword,
        displayName: name.trim(),
      });

      const studentData = {
        usn: normalizedUSN,
        uid: userRecord.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : '',
        department,
        year: parsedYear,
        section: section.trim().toUpperCase(),
        role: 'student',
        status: 'active',
        isDemo: false,
        createdAt: new Date().toISOString(),
      };

      transaction.set(studentRef, studentData);
      transaction.set(db.collection('users').doc(userRecord.uid), studentData);

      // Generate secure password reset/setup link
      const resetLink = await auth.generatePasswordResetLink(email.trim().toLowerCase());

      return { student: studentData, resetLink };
    });

    res.status(201).json({
      success: true,
      student: result.student,
      message: `Account created securely. Password setup link: ${result.resetLink}`,
    });
  } catch (err) {
    if (err.message.startsWith('USN_EXISTS:')) {
      return res.status(409).json({ error: `USN ${normalizedUSN} is already registered in the system.` });
    }
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Failed to create student account: ' + err.message });
  }
});

// Edit Student (Admin)
app.patch('/api/students/:usn', requireAdmin, async (req, res) => {
  const normalizedUSN = req.params.usn.trim().toUpperCase();
  const { name, email, phone, department, year, section } = req.body;

  if (isMock) {
    const existing = mockStore.students.get(normalizedUSN);
    if (!existing) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const updated = {
      ...existing,
      name: name ? name.trim() : existing.name,
      email: email ? email.trim().toLowerCase() : existing.email,
      phone: phone !== undefined ? phone.trim() : existing.phone,
      department: department || existing.department,
      year: year ? Number(year) : existing.year,
      section: section ? section.trim().toUpperCase() : existing.section,
    };

    mockStore.students.set(normalizedUSN, updated);
    if (mockStore.users.has(existing.uid)) {
      mockStore.users.set(existing.uid, updated);
    }

    return res.json({ success: true, student: updated });
  }

  try {
    const studentRef = db.collection('students').doc(normalizedUSN);
    const doc = await studentRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    const existing = doc.data();
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (department) updateData.department = department;
    if (year) updateData.year = Number(year);
    if (section) updateData.section = section.trim().toUpperCase();

    await studentRef.update(updateData);
    if (existing.uid) {
      await db.collection('users').doc(existing.uid).update(updateData);
    }

    res.json({ success: true, student: { ...existing, ...updateData } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Faculty Directory (Admin)
app.get('/api/faculty', requireAdmin, async (req, res) => {
  if (isMock) {
    return res.json(Array.from(mockStore.faculty.values()));
  }
  try {
    const snapshot = await db.collection('faculty').get();
    const list = snapshot.docs.map(doc => doc.data());
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Faculty (Admin - Secure server-side operation)
app.post('/api/faculty', requireAdmin, async (req, res) => {
  const { name, email, department, assignedClasses } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Faculty name is required.' });
  }
  if (!email || !email.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid college email is required.' });
  }
  if (!department) {
    return res.status(400).json({ error: 'Department is required.' });
  }
  if (!Array.isArray(assignedClasses) || assignedClasses.length === 0) {
    return res.status(400).json({ error: 'At least one assigned class section is required.' });
  }

  if (isMock) {
    // Check if faculty with email already exists
    const existing = Array.from(mockStore.faculty.values()).find(
      f => f.email && f.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (existing) {
      return res.status(409).json({ error: `Faculty account with email ${email} already exists.` });
    }

    const uid = 'fac-' + crypto.randomUUID();
    const newFaculty = {
      uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department,
      assignedClasses,
      role: 'faculty',
      status: 'active',
      isDemo: false,
      createdAt: new Date().toISOString(),
    };

    mockStore.faculty.set(uid, newFaculty);
    mockStore.users.set(uid, newFaculty);

    return res.status(201).json({
      success: true,
      faculty: newFaculty,
      message: `Faculty account created. First-login instructions sent to ${newFaculty.email}.`,
    });
  }

  try {
    const tempPassword = 'Edu' + crypto.randomBytes(6).toString('hex') + '!';
    const userRecord = await auth.createUser({
      email: email.trim().toLowerCase(),
      password: tempPassword,
      displayName: name.trim(),
    });

    const facultyData = {
      uid: userRecord.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department,
      assignedClasses,
      role: 'faculty',
      status: 'active',
      isDemo: false,
      createdAt: new Date().toISOString(),
    };

    await db.collection('faculty').doc(userRecord.uid).set(facultyData);
    await db.collection('users').doc(userRecord.uid).set(facultyData);

    const resetLink = await auth.generatePasswordResetLink(email.trim().toLowerCase());

    res.status(201).json({
      success: true,
      faculty: facultyData,
      message: `Faculty account created securely. Password setup link: ${resetLink}`,
    });
  } catch (err) {
    console.error('Error creating faculty:', err);
    res.status(500).json({ error: 'Failed to create faculty: ' + err.message });
  }
});

// Edit Faculty (Admin)
app.patch('/api/faculty/:uid', requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { name, email, department, assignedClasses } = req.body;

  if (isMock) {
    const existing = mockStore.faculty.get(uid);
    if (!existing) {
      return res.status(404).json({ error: 'Faculty record not found.' });
    }

    const updated = {
      ...existing,
      name: name ? name.trim() : existing.name,
      email: email ? email.trim().toLowerCase() : existing.email,
      department: department || existing.department,
      assignedClasses: assignedClasses || existing.assignedClasses,
    };

    mockStore.faculty.set(uid, updated);
    if (mockStore.users.has(uid)) {
      mockStore.users.set(uid, updated);
    }

    return res.json({ success: true, faculty: updated });
  }

  try {
    const facultyRef = db.collection('faculty').doc(uid);
    const doc = await facultyRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Faculty record not found.' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (department) updateData.department = department;
    if (assignedClasses) updateData.assignedClasses = assignedClasses;

    await facultyRef.update(updateData);
    await db.collection('users').doc(uid).update(updateData);

    res.json({ success: true, faculty: { ...doc.data(), ...updateData } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disable / Enable Account (Admin)
app.patch('/api/users/:uid/status', requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const { status } = req.body;

  if (status !== 'active' && status !== 'disabled') {
    return res.status(400).json({ error: "Status must be either 'active' or 'disabled'." });
  }

  if (isMock) {
    const user = mockStore.users.get(uid);
    if (!user) {
      return res.status(404).json({ error: 'User record not found.' });
    }
    user.status = status;
    mockStore.users.set(uid, user);

    if (user.role === 'student' && user.usn && mockStore.students.has(user.usn)) {
      const stu = mockStore.students.get(user.usn);
      stu.status = status;
      mockStore.students.set(user.usn, stu);
    }
    if (user.role === 'faculty' && mockStore.faculty.has(uid)) {
      const fac = mockStore.faculty.get(uid);
      fac.status = status;
      mockStore.faculty.set(uid, fac);
    }

    return res.json({ success: true, message: `Account status updated to ${status}.`, user });
  }

  try {
    // Update Auth user disabled flag
    await auth.updateUser(uid, { disabled: status === 'disabled' });

    // Update Firestore user doc
    await db.collection('users').doc(uid).update({ status });

    // Update student or faculty doc if exists
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      if (data.role === 'student' && data.usn) {
        await db.collection('students').doc(data.usn).update({ status });
      } else if (data.role === 'faculty') {
        await db.collection('faculty').doc(uid).update({ status });
      }
    }

    res.json({ success: true, message: `Account status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FACULTY & STUDENT DATA ENDPOINTS (For mock/dev)
// ==========================================

// Get user profile by UID or email (for sign-in verification)
app.get('/api/users/:identifier', async (req, res) => {
  const { identifier } = req.params;
  if (isMock) {
    const user = mockStore.users.get(identifier) ||
      Array.from(mockStore.users.values()).find(
        u => (u.email && u.email.toLowerCase() === identifier.toLowerCase()) || (u.usn && u.usn === identifier.toUpperCase())
      );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  }

  try {
    let doc = await db.collection('users').doc(identifier).get();
    if (!doc.exists) {
      const snapshot = await db.collection('users').where('email', '==', identifier.toLowerCase()).limit(1).get();
      if (!snapshot.empty) {
        doc = snapshot.docs[0];
      }
    }
    if (doc && doc.exists) {
      return res.json(doc.data());
    }
    res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mock Auth Sign-in endpoint (Used seamlessly when client is in mock mode or emulator)
app.post('/api/auth/sign-in', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = Array.from(mockStore.users.values()).find(
    u => u.email && u.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (!user) {
    return res.status(401).json({ error: 'No account found with this college email address.' });
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ error: 'This account has been disabled by the administrator.' });
  }

  // Check demo password or valid password
  if (password !== DEMO_PASSWORD && password !== 'password123') {
    return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
  }

  res.json({
    success: true,
    user,
    token: user.uid,
  });
});

// Get students for a specific class (Faculty)
app.get('/api/classes/students', (req, res) => {
  const { department, year, section } = req.query;
  if (!department || !year || !section) {
    return res.status(400).json({ error: 'Department, year, and section required.' });
  }

  if (isMock) {
    const list = Array.from(mockStore.students.values()).filter(
      s => s.department === department && s.year === Number(year) && s.section === section
    );
    return res.json(list);
  }

  db.collection('students')
    .where('department', '==', department)
    .where('year', '==', Number(year))
    .where('section', '==', section)
    .get()
    .then(snapshot => res.json(snapshot.docs.map(d => d.data())))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Assignments: Get by class
app.get('/api/assignments', (req, res) => {
  const { department, year, section } = req.query;
  if (isMock) {
    let list = Array.from(mockStore.assignments.values());
    if (department && year && section) {
      list = list.filter(a => a.department === department && a.year === Number(year) && a.section === section);
    }
    return res.json(list);
  }

  let query = db.collection('assignments');
  if (department && year && section) {
    query = query.where('department', '==', department)
                 .where('year', '==', Number(year))
                 .where('section', '==', section);
  }
  query.get()
    .then(snapshot => res.json(snapshot.docs.map(d => d.data())))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Assignments: Create (Faculty)
app.post('/api/assignments', (req, res) => {
  const { title, description, department, year, section, dueDate, facultyId, facultyName } = req.body;
  if (!title || !department || !year || !section || !dueDate) {
    return res.status(400).json({ error: 'Title, class section, and due date are required.' });
  }

  const id = 'asg-' + crypto.randomUUID();
  const newAssignment = {
    id,
    title: title.trim(),
    description: description ? description.trim() : '',
    department,
    year: Number(year),
    section,
    dueDate,
    createdByFacultyId: facultyId,
    facultyName: facultyName || 'Faculty',
    createdAt: new Date().toISOString(),
  };

  if (isMock) {
    mockStore.assignments.set(id, newAssignment);
    return res.status(201).json({ success: true, assignment: newAssignment });
  }

  db.collection('assignments').doc(id).set(newAssignment)
    .then(() => res.status(201).json({ success: true, assignment: newAssignment }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Attendance: Get by class
app.get('/api/attendance', (req, res) => {
  const { department, year, section } = req.query;
  if (isMock) {
    let list = Array.from(mockStore.attendance.values());
    if (department && year && section) {
      list = list.filter(a => a.department === department && a.year === Number(year) && a.section === section);
    }
    return res.json(list);
  }

  let query = db.collection('attendance');
  if (department && year && section) {
    query = query.where('department', '==', department)
                 .where('year', '==', Number(year))
                 .where('section', '==', section);
  }
  query.get()
    .then(snapshot => res.json(snapshot.docs.map(d => d.data())))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Attendance: Save (Faculty)
app.post('/api/attendance', (req, res) => {
  const { department, year, section, date, subject, records, facultyId } = req.body;
  if (!department || !year || !section || !date || !records) {
    return res.status(400).json({ error: 'Class, date, and attendance records are required.' });
  }

  const id = 'att-' + crypto.randomUUID();
  const attendanceDoc = {
    id,
    department,
    year: Number(year),
    section,
    date,
    subject: subject ? subject.trim() : 'General',
    records,
    markedByFacultyId: facultyId,
    createdAt: new Date().toISOString(),
  };

  if (isMock) {
    mockStore.attendance.set(id, attendanceDoc);
    return res.status(201).json({ success: true, attendance: attendanceDoc });
  }

  db.collection('attendance').doc(id).set(attendanceDoc)
    .then(() => res.status(201).json({ success: true, attendance: attendanceDoc }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Marks: Get by class
app.get('/api/marks', (req, res) => {
  const { department, year, section } = req.query;
  if (isMock) {
    let list = Array.from(mockStore.marks.values());
    if (department && year && section) {
      list = list.filter(m => m.department === department && m.year === Number(year) && m.section === section);
    }
    return res.json(list);
  }

  let query = db.collection('marks');
  if (department && year && section) {
    query = query.where('department', '==', department)
                 .where('year', '==', Number(year))
                 .where('section', '==', section);
  }
  query.get()
    .then(snapshot => res.json(snapshot.docs.map(d => d.data())))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Marks: Save (Faculty)
app.post('/api/marks', (req, res) => {
  const { department, year, section, assessmentTitle, maxMarks, records, facultyId } = req.body;
  if (!department || !year || !section || !assessmentTitle || !maxMarks || !records) {
    return res.status(400).json({ error: 'Assessment title, max marks, class, and marks records are required.' });
  }

  const id = 'mrk-' + crypto.randomUUID();
  const markDoc = {
    id,
    department,
    year: Number(year),
    section,
    assessmentTitle: assessmentTitle.trim(),
    maxMarks: Number(maxMarks),
    records,
    recordedByFacultyId: facultyId,
    createdAt: new Date().toISOString(),
  };

  if (isMock) {
    mockStore.marks.set(id, markDoc);
    return res.status(201).json({ success: true, mark: markDoc });
  }

  db.collection('marks').doc(id).set(markDoc)
    .then(() => res.status(201).json({ success: true, mark: markDoc }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Student Dashboard Data
app.get('/api/student/dashboard-data/:usn', (req, res) => {
  const normalizedUSN = req.params.usn.trim().toUpperCase();

  if (isMock) {
    const student = mockStore.students.get(normalizedUSN);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get assignments for student's class
    const assignments = Array.from(mockStore.assignments.values()).filter(
      a => a.department === student.department && a.year === student.year && a.section === student.section
    );

    // Get courses for student's class
    const courses = Array.from(mockStore.courses.values()).filter(
      c => c.department === student.department && c.year === student.year && c.sections.includes(student.section)
    );

    // Get attendance for student's class
    const attendance = Array.from(mockStore.attendance.values())
      .filter(a => a.department === student.department && a.year === student.year && a.section === student.section)
      .map(att => ({
        id: att.id,
        date: att.date,
        subject: att.subject,
        status: att.records[normalizedUSN] || 'not recorded',
      }));

    // Get marks
    const marks = Array.from(mockStore.marks.values())
      .filter(m => m.department === student.department && m.year === student.year && m.section === student.section)
      .map(mrk => ({
        id: mrk.id,
        assessmentTitle: mrk.assessmentTitle,
        maxMarks: mrk.maxMarks,
        obtainedMarks: mrk.records[normalizedUSN] !== undefined ? mrk.records[normalizedUSN] : null,
      }));

    return res.json({
      student,
      courses,
      assignments,
      attendance,
      marks,
    });
  }

  // Firebase Firestore retrieval
  db.collection('students').doc(normalizedUSN).get()
    .then(async (doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Student not found' });
      }
      const student = doc.data();

      const asgSnapshot = await db.collection('assignments')
        .where('department', '==', student.department)
        .where('year', '==', student.year)
        .where('section', '==', student.section)
        .get();
      const assignments = asgSnapshot.docs.map(d => d.data());

      const courseSnapshot = await db.collection('courses')
        .where('department', '==', student.department)
        .where('year', '==', student.year)
        .get();
      const courses = courseSnapshot.docs
        .map(d => d.data())
        .filter(c => c.sections && c.sections.includes(student.section));

      const attSnapshot = await db.collection('attendance')
        .where('department', '==', student.department)
        .where('year', '==', student.year)
        .where('section', '==', student.section)
        .get();
      const attendance = attSnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: data.id,
          date: data.date,
          subject: data.subject,
          status: data.records ? data.records[normalizedUSN] || 'not recorded' : 'not recorded',
        };
      });

      const mrkSnapshot = await db.collection('marks')
        .where('department', '==', student.department)
        .where('year', '==', student.year)
        .where('section', '==', student.section)
        .get();
      const marks = mrkSnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: data.id,
          assessmentTitle: data.assessmentTitle,
          maxMarks: data.maxMarks,
          obtainedMarks: data.records && data.records[normalizedUSN] !== undefined ? data.records[normalizedUSN] : null,
        };
      });

      res.json({ student, courses, assignments, attendance, marks });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` EduMate Admin SDK Server running on port ${PORT}`);
  console.log(` Mode: ${isMock ? 'Local In-Memory Mock (Offline Demo Safe)' : 'Firebase Live / Emulator'}`);
  console.log(` Admin Account: ${DEMO_ADMIN.email} (Password: ${DEMO_PASSWORD})`);
  console.log(` Faculty Directory: ${DEMO_FACULTY.length} Profiles (No local credentials assigned)`);
  console.log(` Sample Student: ${DEMO_STUDENTS[0].email} (Password: ${DEMO_PASSWORD})`);
  console.log(` Total Sample Students: ${DEMO_STUDENTS.length} (AIML 3-A, 3-B, 3-C)`);
  console.log(`====================================================`);
});
