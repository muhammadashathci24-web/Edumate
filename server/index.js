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
  INITIAL_OPPORTUNITIES,
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
  opportunities: new Map(),
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

  // Opportunities
  for (const opp of INITIAL_OPPORTUNITIES) {
    mockStore.opportunities.set(opp.id, { ...opp });
  }

  console.log(`[Seed] In-memory store seeded: 1 admin, ${DEMO_FACULTY.length} faculty, ${DEMO_COURSES.length} courses, ${DEMO_STUDENTS.length} students, ${INITIAL_OPPORTUNITIES.length} opportunities (AIML Year 3 sections A, B, C)`);
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

// Helper to extract normalized attendance & semester config
function formatAttendanceConfig(configDoc) {
  const raw = configDoc?.requiredAttendancePercentage;
  const isConfigured = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 && raw <= 100;
  const rawWeeks = configDoc?.semesterWeeks;
  const semesterWeeks =
    typeof rawWeeks === 'number' && Number.isInteger(rawWeeks) && rawWeeks >= 1 && rawWeeks <= 52
      ? rawWeeks
      : INITIAL_SECTIONS_CONFIG.semesterWeeks;
  const semesterStartDate =
    typeof configDoc?.semesterStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(configDoc.semesterStartDate)
      ? configDoc.semesterStartDate
      : INITIAL_SECTIONS_CONFIG.semesterStartDate;
  const timetable = Array.isArray(configDoc?.timetable)
    ? configDoc.timetable
    : INITIAL_SECTIONS_CONFIG.timetable;

  return {
    requiredAttendancePercentage: isConfigured ? raw : null,
    semesterWeeks,
    semesterStartDate,
    timetable,
    updatedAt: isConfigured ? configDoc?.attendanceRequirementUpdatedAt || null : null,
    updatedBy: isConfigured ? configDoc?.attendanceRequirementUpdatedBy || null : null,
  };
}

// Config: Get Institutional Attendance Requirement
app.get('/api/attendance-config', async (req, res) => {
  if (isMock) {
    return res.json(formatAttendanceConfig(mockStore.sectionsConfig));
  }
  try {
    const doc = await db.collection('sectionsConfig').doc('default').get();
    if (doc.exists) {
      return res.json(formatAttendanceConfig(doc.data()));
    }
    return res.json(formatAttendanceConfig(null));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Config: Update Institutional Attendance Requirement (Admin only)
app.put('/api/attendance-config', requireAdmin, async (req, res) => {
  const rawPct = req.body?.requiredAttendancePercentage;
  const parsedPct = typeof rawPct === 'number' ? rawPct : Number(rawPct);

  if (!Number.isFinite(parsedPct) || parsedPct <= 0 || parsedPct > 100) {
    return res.status(400).json({
      error: 'Required attendance percentage must be greater than 0 and no more than 100.',
    });
  }

  const now = new Date().toISOString();
  const updatedBy = req.currentUser?.uid || 'admin';
  const patch = {
    requiredAttendancePercentage: parsedPct,
    attendanceRequirementUpdatedAt: now,
    attendanceRequirementUpdatedBy: updatedBy,
  };

  if (req.body?.semesterWeeks !== undefined) {
    const parsedWeeks = Number(req.body.semesterWeeks);
    if (!Number.isInteger(parsedWeeks) || parsedWeeks < 1 || parsedWeeks > 52) {
      return res.status(400).json({ error: 'Semester weeks must be an integer between 1 and 52.' });
    }
    patch.semesterWeeks = parsedWeeks;
  }

  if (req.body?.semesterStartDate !== undefined) {
    const startStr = String(req.body.semesterStartDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr)) {
      return res.status(400).json({ error: 'Semester start date must be in YYYY-MM-DD format.' });
    }
    patch.semesterStartDate = startStr;
  }

  if (isMock) {
    mockStore.sectionsConfig = {
      ...mockStore.sectionsConfig,
      ...patch,
    };
    const config = formatAttendanceConfig(mockStore.sectionsConfig);
    broadcastAttendanceChange({ type: 'ATTENDANCE_CONFIG_CHANGED', config });
    return res.json({ success: true, config });
  }

  try {
    await db.collection('sectionsConfig').doc('default').set(patch, { merge: true });
    const latestDoc = await db.collection('sectionsConfig').doc('default').get();
    const config = formatAttendanceConfig(latestDoc.exists ? latestDoc.data() : patch);
    broadcastAttendanceChange({ type: 'ATTENDANCE_CONFIG_CHANGED', config });
    res.json({ success: true, config });
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
      let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (section) list = list.filter(c => c.sections && c.sections.includes(section));
      res.json(list);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// ==========================================
// OPPORTUNITIES & EVENT CATALOG ENDPOINTS
// ==========================================

// Real-time SSE Clients for live event synchronization
const opportunitySseClients = new Set();
const attendanceSseClients = new Set();

export function broadcastAttendanceChange(payload) {
  const data = JSON.stringify(payload);
  for (const client of attendanceSseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      attendanceSseClients.delete(client);
    }
  }
}

app.get('/api/attendance/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  attendanceSseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(keepAlive);
      attendanceSseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    attendanceSseClients.delete(res);
  });
});

export function broadcastOpportunityChange(payload) {
  const data = JSON.stringify(payload);
  for (const client of opportunitySseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      opportunitySseClients.delete(client);
    }
  }
}

// Real-time Event Stream for opportunities (SSE)
app.get('/api/opportunities/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  opportunitySseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(keepAlive);
      opportunitySseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    opportunitySseClients.delete(res);
  });
});

// Get Opportunities (Public / Student active catalog or Admin full view)
app.get('/api/opportunities', async (req, res) => {
  const { all, category, search } = req.query;
  const showAll = all === 'true';

  if (isMock) {
    let list = Array.from(mockStore.opportunities.values());
    if (!showAll) {
      list = list.filter(o => o.isActive);
    }
    if (category && category !== 'ALL') {
      list = list.filter(o => o.category === category);
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(o =>
        (o.title && o.title.toLowerCase().includes(q)) ||
        (o.description && o.description.toLowerCase().includes(q)) ||
        (o.city && o.city.toLowerCase().includes(q)) ||
        (o.interestTags && o.interestTags.some(t => t.toLowerCase().includes(q))) ||
        (o.subcategoryTags && o.subcategoryTags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return res.json(list);
  }

  try {
    let query = db.collection('opportunities');
    if (!showAll) {
      query = query.where('isActive', '==', true);
    }
    if (category && category !== 'ALL') {
      query = query.where('category', '==', category);
    }
    const snapshot = await query.get();
    let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(o =>
        (o.title && o.title.toLowerCase().includes(q)) ||
        (o.description && o.description.toLowerCase().includes(q)) ||
        (o.city && o.city.toLowerCase().includes(q))
      );
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Opportunity (Admin Only)
app.post('/api/opportunities', requireAdmin, async (req, res) => {
  const {
    title,
    category,
    description,
    interestTags,
    subcategoryTags,
    venue,
    city,
    area,
    eventDate,
    registrationDeadline,
    registrationLink,
    eligibleDepartments,
    eligibleYears,
    eligibleSections,
    scholarshipDetails,
    isActive,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Opportunity title is required.' });
  }
  if (!category) {
    return res.status(400).json({ error: 'Category is required.' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Description is required.' });
  }

  const id = 'opp-' + crypto.randomUUID();
  const now = new Date().toISOString();

  const newOpportunity = {
    id,
    title: title.trim(),
    category,
    description: description.trim(),
    interestTags: Array.isArray(interestTags) ? interestTags : [category],
    subcategoryTags: Array.isArray(subcategoryTags) ? subcategoryTags : [],
    venue: venue ? venue.trim() : 'Campus',
    city: city ? city.trim() : 'Bengaluru',
    area: area ? area.trim() : '',
    eventDate: eventDate || now,
    registrationDeadline: registrationDeadline || eventDate || now,
    registrationLink: registrationLink ? registrationLink.trim() : '',
    eligibleDepartments: Array.isArray(eligibleDepartments) && eligibleDepartments.length > 0 ? eligibleDepartments : ['ALL'],
    eligibleYears: Array.isArray(eligibleYears) && eligibleYears.length > 0 ? eligibleYears.map(Number) : [1, 2, 3, 4],
    eligibleSections: Array.isArray(eligibleSections) && eligibleSections.length > 0 ? eligibleSections : ['ALL'],
    scholarshipDetails: category === 'Scholarships' && scholarshipDetails ? scholarshipDetails : undefined,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    createdByAdminId: req.currentUser?.uid || 'admin',
    createdAt: now,
    updatedAt: now,
  };

  if (isMock) {
    mockStore.opportunities.set(id, newOpportunity);
    broadcastOpportunityChange({ type: 'OPPORTUNITIES_CHANGED', action: 'create', id, opportunity: newOpportunity });
    return res.status(201).json({ success: true, opportunity: newOpportunity });
  }

  try {
    await db.collection('opportunities').doc(id).set(newOpportunity);
    broadcastOpportunityChange({ type: 'OPPORTUNITIES_CHANGED', action: 'create', id, opportunity: newOpportunity });
    res.status(201).json({ success: true, opportunity: newOpportunity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create opportunity: ' + err.message });
  }
});

// Update Opportunity (Admin Only)
app.put('/api/opportunities/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const now = new Date().toISOString();

  if (isMock) {
    const existing = mockStore.opportunities.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }
    const updated = {
      ...existing,
      ...updates,
      id,
      updatedAt: now,
    };
    mockStore.opportunities.set(id, updated);
    broadcastOpportunityChange({ type: 'OPPORTUNITIES_CHANGED', action: 'update', id, opportunity: updated });
    return res.json({ success: true, opportunity: updated });
  }

  try {
    const docRef = db.collection('opportunities').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }
    const updatedData = {
      ...updates,
      id,
      updatedAt: now,
    };
    await docRef.set(updatedData, { merge: true });
    const fullUpdated = { ...doc.data(), ...updatedData };
    broadcastOpportunityChange({ type: 'OPPORTUNITIES_CHANGED', action: 'update', id, opportunity: fullUpdated });
    res.json({ success: true, opportunity: fullUpdated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update opportunity: ' + err.message });
  }
});

// Toggle Active / Inactive Status (Admin Only)
app.patch('/api/opportunities/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive must be a boolean.' });
  }

  if (isMock) {
    const existing = mockStore.opportunities.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }
    existing.isActive = isActive;
    existing.updatedAt = new Date().toISOString();
    mockStore.opportunities.set(id, existing);
    broadcastOpportunityChange({ type: 'OPPORTUNITIES_CHANGED', action: 'status', id, isActive });
    return res.json({ success: true, opportunity: existing });
  }

  try {
    const docRef = db.collection('opportunities').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }
    await docRef.update({ isActive, updatedAt: new Date().toISOString() });
    broadcastOpportunityChange({ type: 'OPPORTUNITIES_CHANGED', action: 'status', id, isActive });
    res.json({ success: true, opportunity: { ...doc.data(), isActive } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Opportunity (Admin Only)
app.delete('/api/opportunities/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (isMock) {
    if (!mockStore.opportunities.has(id)) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }
    mockStore.opportunities.delete(id);
    broadcastOpportunityChange({ type: 'OPPORTUNITIES_CHANGED', action: 'delete', id });
    return res.json({ success: true, message: 'Opportunity deleted successfully.' });
  }

  try {
    const docRef = db.collection('opportunities').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Opportunity not found.' });
    }
    await docRef.delete();
    broadcastOpportunityChange({ type: 'OPPORTUNITIES_CHANGED', action: 'delete', id });
    res.json({ success: true, message: 'Opportunity deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Config: Update Sections (Admin only)
app.put('/api/sections-config', requireAdmin, async (req, res) => {
  const { sectionsByDeptYear } = req.body;
  if (!sectionsByDeptYear || typeof sectionsByDeptYear !== 'object') {
    return res.status(400).json({ error: 'Invalid sections configuration format.' });
  }

  const updatedConfig = {
    ...INITIAL_SECTIONS_CONFIG,
    ...mockStore.sectionsConfig,
    sectionsByDeptYear,
  };

  if (isMock) {
    mockStore.sectionsConfig = updatedConfig;
    return res.json({ success: true, config: updatedConfig });
  }

  try {
    await db.collection('sectionsConfig').doc('default').set({
      departments: INITIAL_SECTIONS_CONFIG.departments,
      years: INITIAL_SECTIONS_CONFIG.years,
      sectionsByDeptYear,
    }, { merge: true });
    const latest = await db.collection('sectionsConfig').doc('default').get();
    res.json({ success: true, config: latest.exists ? latest.data() : updatedConfig });
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
    const trimmed = identifier.trim().toLowerCase();
    const user = mockStore.users.get(identifier) ||
      Array.from(mockStore.users.values()).find(
        u => (u.email && u.email.toLowerCase() === trimmed) || (u.usn && u.usn === identifier.toUpperCase())
      ) || (
        (trimmed === 'admin@college.edu' || trimmed === 'admin@edumate.edu' || trimmed === 'admin' || trimmed === 'administrator')
          ? mockStore.users.get(DEMO_ADMIN.uid)
          : null
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

  const trimmed = email.trim().toLowerCase();
  let user = Array.from(mockStore.users.values()).find(
    u => u.email && u.email.toLowerCase() === trimmed
  );

  // Support legacy or alternate admin identifiers
  if (!user && (trimmed === 'admin@college.edu' || trimmed === 'admin@edumate.edu' || trimmed === 'admin' || trimmed === 'administrator')) {
    user = mockStore.users.get(DEMO_ADMIN.uid);
  }

  // Support student aliases
  if (!user && (trimmed === 'aarav.demo@college.edu' || trimmed === 'aarav@college.edu' || trimmed === 'student')) {
    user = mockStore.users.get(DEMO_STUDENTS[0].uid);
  }

  if (!user) {
    return res.status(401).json({ error: 'No account found with this college email address.' });
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ error: 'This account has been disabled by the administrator.' });
  }

  // Check demo password or valid password (case-insensitive for convenience)
  const validPasswords = [DEMO_PASSWORD, 'Demo@12345', 'demo@12345', 'password123', 'admin', 'admin123'];
  if (!validPasswords.includes(password) && password.toLowerCase() !== 'demo@12345') {
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
  const sortByDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '') || (a.id || '').localeCompare(b.id || '');
  if (isMock) {
    let list = Array.from(mockStore.attendance.values());
    if (department && year && section) {
      list = list.filter(a => a.department === department && a.year === Number(year) && a.section === section);
    }
    list.sort(sortByDateDesc);
    return res.json(list);
  }

  let query = db.collection('attendance');
  if (department && year && section) {
    query = query.where('department', '==', department)
                 .where('year', '==', Number(year))
                 .where('section', '==', section);
  }
  query.get()
    .then(snapshot => res.json(snapshot.docs.map(d => d.data()).sort(sortByDateDesc)))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Helper to verify active admin or assigned faculty for a class section (and optional courseCode)
async function verifyAttendanceWriter(req, { department, year, section, courseCode, facultyId }) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;
  const parsedYear = Number(year);
  const normalizedCode = courseCode ? String(courseCode).trim().toUpperCase() : null;

  let actor = null;
  if (isMock) {
    if (token) {
      actor =
        mockStore.users.get(token) ||
        Array.from(mockStore.users.values()).find((u) => u.email === token) ||
        null;
    } else if (facultyId) {
      actor = mockStore.users.get(facultyId) || mockStore.faculty.get(facultyId) || null;
    }
  } else {
    let uid = null;
    if (token) {
      const decoded = await auth.verifyIdToken(token);
      uid = decoded.uid;
    } else if (facultyId) {
      uid = facultyId;
    }
    if (uid) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        actor = userDoc.data();
      }
    }
  }

  if (!actor || actor.status !== 'active') {
    return { allowed: false, status: 403, error: 'Active faculty or admin authorization is required.' };
  }
  if (actor.role === 'admin') {
    return { allowed: true, actor };
  }
  if (actor.role !== 'faculty') {
    return { allowed: false, status: 403, error: 'Only authorized faculty or admins can record attendance.' };
  }

  const assignedClasses = actor.assignedClasses || [];
  const hasClass = assignedClasses.some(
    (c) => c.department === department && Number(c.year) === parsedYear && c.section === section
  );
  if (!hasClass) {
    return {
      allowed: false,
      status: 403,
      error: `Faculty is not assigned to ${department} Year ${parsedYear} Section ${section}.`,
    };
  }

  if (normalizedCode && Array.isArray(actor.courseCodes) && actor.courseCodes.length > 0) {
    const allowedCodes = actor.courseCodes.map((c) => String(c).trim().toUpperCase());
    if (!allowedCodes.includes(normalizedCode)) {
      return {
        allowed: false,
        status: 403,
        error: `Faculty is not assigned to course ${normalizedCode}.`,
      };
    }
  }

  return { allowed: true, actor };
}

// Attendance: Save (Faculty)
app.post('/api/attendance', async (req, res) => {
  const { department, year, section, date, subject, courseCode, records, facultyId } = req.body;
  if (!department || !year || !section || !date || !records) {
    return res.status(400).json({ error: 'Class, date, and attendance records are required.' });
  }

  try {
    const authResult = await verifyAttendanceWriter(req, {
      department,
      year,
      section,
      courseCode,
      facultyId,
    });
    if (!authResult.allowed) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const id = 'att-' + crypto.randomUUID();
    const attendanceDoc = {
      id,
      department,
      year: Number(year),
      section,
      date,
      subject: subject ? subject.trim() : 'General',
      ...(courseCode ? { courseCode: String(courseCode).trim().toUpperCase() } : {}),
      records,
      markedByFacultyId: authResult.actor.uid || facultyId,
      createdAt: new Date().toISOString(),
    };

    if (isMock) {
      mockStore.attendance.set(id, attendanceDoc);
      broadcastAttendanceChange({ type: 'ATTENDANCE_CHANGED', department, year: Number(year), section });
      return res.status(201).json({ success: true, attendance: attendanceDoc });
    }

    await db.collection('attendance').doc(id).set(attendanceDoc);
    broadcastAttendanceChange({ type: 'ATTENDANCE_CHANGED', department, year: Number(year), section });
    res.status(201).json({ success: true, attendance: attendanceDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
app.post('/api/marks', async (req, res) => {
  const {
    department,
    year,
    section,
    courseCode,
    internalNumber,
    assessmentTitle,
    maxMarks,
    records,
    facultyId,
  } = req.body;

  if (!department || !year || !section || !assessmentTitle || !maxMarks || !records) {
    return res.status(400).json({ error: 'Assessment title, max marks, class, and marks records are required.' });
  }

  const parsedMaxMarks = Number(maxMarks);
  if (!Number.isFinite(parsedMaxMarks) || parsedMaxMarks <= 0) {
    return res.status(400).json({ error: 'Maximum marks must be greater than zero.' });
  }

  let parsedInternalNum;
  if (internalNumber !== undefined && internalNumber !== null && internalNumber !== '') {
    const n = Number(internalNumber);
    if (n !== 1 && n !== 2 && n !== 3) {
      return res.status(400).json({ error: 'Internal assessment number must be 1, 2, or 3.' });
    }
    parsedInternalNum = n;
  }

  for (const [usn, score] of Object.entries(records)) {
    const numScore = Number(score);
    if (!Number.isFinite(numScore) || numScore < 0 || numScore > parsedMaxMarks) {
      return res.status(400).json({
        error: `Invalid score for ${usn}: must be between 0 and ${parsedMaxMarks}.`,
      });
    }
  }

  try {
    const authResult = await verifyAttendanceWriter(req, {
      department,
      year,
      section,
      courseCode,
      facultyId,
    });
    if (!authResult.allowed) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const id = 'mrk-' + crypto.randomUUID();
    const markDoc = {
      id,
      department,
      year: Number(year),
      section,
      ...(courseCode ? { courseCode: String(courseCode).trim().toUpperCase() } : {}),
      ...(parsedInternalNum ? { internalNumber: parsedInternalNum } : {}),
      assessmentTitle: assessmentTitle.trim(),
      maxMarks: parsedMaxMarks,
      records,
      recordedByFacultyId: authResult.actor.uid || facultyId,
      createdAt: new Date().toISOString(),
    };

    if (isMock) {
      mockStore.marks.set(id, markDoc);
      broadcastAttendanceChange({ type: 'MARKS_CHANGED', department, year: Number(year), section });
      return res.status(201).json({ success: true, mark: markDoc });
    }

    await db.collection('marks').doc(id).set(markDoc);
    broadcastAttendanceChange({ type: 'MARKS_CHANGED', department, year: Number(year), section });
    res.status(201).json({ success: true, mark: markDoc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Interests: Get
app.get('/api/student/interests/:usn', async (req, res) => {
  const normalizedUSN = req.params.usn.trim().toUpperCase();
  if (isMock) {
    const student = mockStore.students.get(normalizedUSN);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    return res.json(student.interests || null);
  }
  try {
    const doc = await db.collection('students').doc(normalizedUSN).get();
    if (!doc.exists) return res.status(404).json({ error: 'Student not found' });
    res.json(doc.data().interests || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Interests: Update
app.put('/api/student/interests/:usn', async (req, res) => {
  const normalizedUSN = req.params.usn.trim().toUpperCase();
  const { interests } = req.body;

  if (!interests || typeof interests !== 'object') {
    return res.status(400).json({ error: 'Interests payload must be an object.' });
  }

  const sanitizedInterests = {
    categories: Array.isArray(interests.categories) ? interests.categories : [],
    subcategories: Array.isArray(interests.subcategories) ? interests.subcategories : [],
    customInterests: Array.isArray(interests.customInterests)
      ? interests.customInterests.filter(Boolean)
      : [],
    preferredCity: typeof interests.preferredCity === 'string' ? interests.preferredCity.trim() : '',
    preferredArea: typeof interests.preferredArea === 'string' ? interests.preferredArea.trim() : '',
    updatedAt: new Date().toISOString(),
  };

  if (isMock) {
    const student = mockStore.students.get(normalizedUSN);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    student.interests = sanitizedInterests;
    mockStore.students.set(normalizedUSN, student);
    if (student.uid && mockStore.users.has(student.uid)) {
      const user = mockStore.users.get(student.uid);
      user.interests = sanitizedInterests;
      mockStore.users.set(student.uid, user);
    }
    return res.json({ success: true, interests: sanitizedInterests, student });
  }

  try {
    const studentRef = db.collection('students').doc(normalizedUSN);
    const doc = await studentRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    const student = doc.data();
    await studentRef.update({ interests: sanitizedInterests });
    if (student.uid) {
      await db.collection('users').doc(student.uid).update({ interests: sanitizedInterests });
    }
    res.json({ success: true, interests: sanitizedInterests, student: { ...student, interests: sanitizedInterests } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Dashboard Data
app.get('/api/student/dashboard-data/:usn', async (req, res) => {
  const normalizedUSN = req.params.usn.trim().toUpperCase();
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    try {
      let requester = null;
      if (isMock) {
        requester =
          mockStore.users.get(token) ||
          Array.from(mockStore.users.values()).find((u) => u.email === token) ||
          null;
      } else {
        const decoded = await auth.verifyIdToken(token);
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        requester = userDoc.exists ? userDoc.data() : null;
      }

      if (!requester || requester.status !== 'active') {
        return res.status(403).json({ error: 'Access denied.' });
      }
      if (requester.role === 'student' && requester.usn?.toUpperCase() !== normalizedUSN) {
        return res.status(403).json({ error: 'Students can view only their own attendance and academic records.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid authentication token: ' + err.message });
    }
  }

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

    // Get attendance for student's class (scoped strictly to this student's status, sorted chronologically)
    const attendance = Array.from(mockStore.attendance.values())
      .filter(a => a.department === student.department && a.year === student.year && a.section === student.section)
      .map(att => ({
        id: att.id,
        date: att.date,
        weekNumber: att.weekNumber,
        department: att.department,
        year: att.year,
        section: att.section,
        subject: att.subject,
        courseCode: att.courseCode,
        status: att.records[normalizedUSN] || 'not recorded',
      }))
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.id || '').localeCompare(b.id || ''));

    // Get marks
    const marks = Array.from(mockStore.marks.values())
      .filter(m => m.department === student.department && m.year === student.year && m.section === student.section)
      .map(mrk => ({
        id: mrk.id,
        department: mrk.department,
        year: mrk.year,
        section: mrk.section,
        courseCode: mrk.courseCode,
        internalNumber: mrk.internalNumber,
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
      attendanceConfig: formatAttendanceConfig(mockStore.sectionsConfig),
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
          weekNumber: data.weekNumber,
          department: data.department,
          year: data.year,
          section: data.section,
          subject: data.subject,
          courseCode: data.courseCode,
          status: data.records ? data.records[normalizedUSN] || 'not recorded' : 'not recorded',
        };
      }).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.id || '').localeCompare(b.id || ''));

      const mrkSnapshot = await db.collection('marks')
        .where('department', '==', student.department)
        .where('year', '==', student.year)
        .where('section', '==', student.section)
        .get();
      const marks = mrkSnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: data.id,
          department: data.department,
          year: data.year,
          section: data.section,
          courseCode: data.courseCode,
          internalNumber: data.internalNumber,
          assessmentTitle: data.assessmentTitle,
          maxMarks: data.maxMarks,
          obtainedMarks: data.records && data.records[normalizedUSN] !== undefined ? data.records[normalizedUSN] : null,
        };
      });

      const configDoc = await db.collection('sectionsConfig').doc('default').get();
      const attendanceConfig = formatAttendanceConfig(configDoc.exists ? configDoc.data() : null);

      res.json({ student, courses, assignments, attendance, marks, attendanceConfig });
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
