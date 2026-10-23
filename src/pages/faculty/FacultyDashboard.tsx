import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/Alert';
import { Student, Assignment, AttendanceRecord, MarkRecord, ClassSection } from '../../lib/types';
import { Users, BookOpen, CalendarCheck, Award, Plus, Save } from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { profile } = useAuth();
  const assignedClasses: ClassSection[] = profile?.assignedClasses || [];

  // Currently selected class (defaults to first assigned class)
  const [selectedClassIndex, setSelectedClassIndex] = useState<number>(0);
  const currentClass: ClassSection | undefined = assignedClasses[selectedClassIndex];

  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'marks' | 'assignments'>('students');

  // Class data
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [marksHistory, setMarksHistory] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  // --- Attendance Tab State ---
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSubject, setAttendanceSubject] = useState<string>('');
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});
  const [savingAttendance, setSavingAttendance] = useState<boolean>(false);

  // --- Marks Tab State ---
  const [assessmentTitle, setAssessmentTitle] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<number>(50);
  const [marksState, setMarksState] = useState<Record<string, number>>({});
  const [savingMarks, setSavingMarks] = useState<boolean>(false);

  // --- Assignment Creation State ---
  const [newAsgTitle, setNewAsgTitle] = useState<string>('');
  const [newAsgDueDate, setNewAsgDueDate] = useState<string>('');
  const [newAsgDescription, setNewAsgDescription] = useState<string>('');
  const [savingAssignment, setSavingAssignment] = useState<boolean>(false);

  // Fetch class data whenever selected class changes
  const loadClassData = async () => {
    if (!currentClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFeedback(null);

    const { department, year, section } = currentClass;

    try {
      // 1. Students in this class
      const stuRes = await fetch(`/api/classes/students?department=${department}&year=${year}&section=${section}`);
      const stuData = await stuRes.json();
      setStudents(stuData || []);

      // Initialize default attendance state (all present)
      const initialAttendance: Record<string, 'present' | 'absent'> = {};
      const initialMarks: Record<string, number> = {};
      for (const s of stuData || []) {
        initialAttendance[s.usn] = 'present';
        initialMarks[s.usn] = 0;
      }
      setAttendanceState(initialAttendance);
      setMarksState(initialMarks);

      // 2. Assignments
      const asgRes = await fetch(`/api/assignments?department=${department}&year=${year}&section=${section}`);
      const asgData = await asgRes.json();
      setAssignments(asgData || []);

      // 3. Attendance
      const attRes = await fetch(`/api/attendance?department=${department}&year=${year}&section=${section}`);
      const attData = await attRes.json();
      setAttendanceHistory(attData || []);

      // 4. Marks
      const mrkRes = await fetch(`/api/marks?department=${department}&year=${year}&section=${section}`);
      const mrkData = await mrkRes.json();
      setMarksHistory(mrkData || []);
    } catch (err: any) {
      console.error('Failed to load class data:', err);
      setFeedback({ type: 'danger', message: 'Error loading class records: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassData();
  }, [selectedClassIndex]);

  // Attendance actions
  const markAllAttendance = (status: 'present' | 'absent') => {
    const updated: Record<string, 'present' | 'absent'> = {};
    for (const s of students) {
      updated[s.usn] = status;
    }
    setAttendanceState(updated);
  };

  const toggleStudentAttendance = (usn: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [usn]: prev[usn] === 'present' ? 'absent' : 'present',
    }));
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    if (!attendanceDate) {
      setFeedback({ type: 'danger', message: 'Please select a date for the attendance session.' });
      return;
    }

    setSavingAttendance(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: currentClass.department,
          year: currentClass.year,
          section: currentClass.section,
          date: attendanceDate,
          subject: attendanceSubject.trim() || 'General Session',
          records: attendanceState,
          facultyId: profile?.uid,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save attendance record.');
      }

      setFeedback({
        type: 'success',
        message: `Attendance for ${currentClass.department} Year ${currentClass.year} (${currentClass.section}) on ${attendanceDate} saved successfully!`,
      });

      // Reload attendance history
      const attRes = await fetch(
        `/api/attendance?department=${currentClass.department}&year=${currentClass.year}&section=${currentClass.section}`
      );
      setAttendanceHistory(await attRes.json());
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setSavingAttendance(false);
    }
  };

  // Marks actions
  const handleScoreChange = (usn: string, val: string) => {
    const num = Number(val);
    setMarksState((prev) => ({
      ...prev,
      [usn]: isNaN(num) ? 0 : num,
    }));
  };

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    if (!assessmentTitle.trim()) {
      setFeedback({ type: 'danger', message: 'Please enter an assessment title (e.g. Internal Assessment 1).' });
      return;
    }
    if (!maxMarks || maxMarks <= 0) {
      setFeedback({ type: 'danger', message: 'Maximum marks must be greater than zero.' });
      return;
    }

    // Validate that no student marks exceed maxMarks
    for (const s of students) {
      const score = marksState[s.usn] || 0;
      if (score < 0 || score > maxMarks) {
        setFeedback({
          type: 'danger',
          message: `Score for ${s.name} (${score}) cannot be negative or exceed maximum marks (${maxMarks}).`,
        });
        return;
      }
    }

    setSavingMarks(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: currentClass.department,
          year: currentClass.year,
          section: currentClass.section,
          assessmentTitle: assessmentTitle.trim(),
          maxMarks: Number(maxMarks),
          records: marksState,
          facultyId: profile?.uid,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save marks record.');
      }

      setFeedback({
        type: 'success',
        message: `Marks for "${assessmentTitle}" in ${currentClass.department} Year ${currentClass.year} (${currentClass.section}) recorded successfully!`,
      });

      setAssessmentTitle('');

      // Reload marks history
      const mrkRes = await fetch(
        `/api/marks?department=${currentClass.department}&year=${currentClass.year}&section=${currentClass.section}`
      );
      setMarksHistory(await mrkRes.json());
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setSavingMarks(false);
    }
  };

  // Assignment creation action
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    if (!newAsgTitle.trim() || !newAsgDueDate) {
      setFeedback({ type: 'danger', message: 'Please provide both assignment title and due date.' });
      return;
    }

    setSavingAssignment(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAsgTitle.trim(),
          description: newAsgDescription.trim(),
          department: currentClass.department,
          year: currentClass.year,
          section: currentClass.section,
          dueDate: newAsgDueDate,
          facultyId: profile?.uid,
          facultyName: profile?.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create assignment.');
      }

      setFeedback({
        type: 'success',
        message: `Assignment "${newAsgTitle}" created for ${currentClass.department} Year ${currentClass.year} (${currentClass.section})!`,
      });

      setNewAsgTitle('');
      setNewAsgDueDate('');
      setNewAsgDescription('');

      // Reload assignments
      const asgRes = await fetch(
        `/api/assignments?department=${currentClass.department}&year=${currentClass.year}&section=${currentClass.section}`
      );
      setAssignments(await asgRes.json());
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setSavingAssignment(false);
    }
  };

  if (!assignedClasses || assignedClasses.length === 0) {
    return (
      <div className="main-content">
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              No Class Sections Assigned
            </h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              You do not have any class sections assigned to your faculty profile yet.
              Please contact the College Administrator to configure your class allocations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 className="page-title">Faculty Portal</h1>
            <p className="page-subtitle">
              Manage student attendance, evaluations, and assignments for your assigned class sections.
            </p>
          </div>
        </div>
      </div>

      {/* Class Section Selection Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--color-primary-light)', borderColor: 'var(--color-primary-border)' }}>
        <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: '0.04em' }}>
                Active Class Section
              </span>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.1rem' }}>
                {currentClass ? `${currentClass.department} — Year ${currentClass.year} (Section ${currentClass.section})` : 'None'}
                {loading && <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '8px' }}>(Loading...)</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="select-assigned-class" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                Switch Assigned Class:
              </label>
              <select
                id="select-assigned-class"
                className="form-select"
                style={{ width: 'auto', minWidth: '220px', backgroundColor: '#ffffff' }}
                value={selectedClassIndex}
                onChange={(e) => setSelectedClassIndex(Number(e.target.value))}
              >
                {assignedClasses.map((cls, idx) => (
                  <option key={`${cls.department}-${cls.year}-${cls.section}`} value={idx}>
                    {cls.department} &bull; Year {cls.year} &bull; Section {cls.section}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Tabs */}
      <nav className="tabs-nav" aria-label="Faculty actions">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={16} /> Students ({students.length})
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <CalendarCheck size={16} /> Record Attendance
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'marks' ? 'active' : ''}`}
          onClick={() => setActiveTab('marks')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award size={16} /> Record Marks
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <BookOpen size={16} /> Class Assignments ({assignments.length})
          </span>
        </button>
      </nav>

      {/* Tab 1: Student Directory for Assigned Class */}
      {activeTab === 'students' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              Enrolled Students in {currentClass?.department} Year {currentClass?.year} (Section {currentClass?.section})
            </h2>
            <span className="badge badge-primary">{students.length} Students</span>
          </div>
          <div className="card-body">
            {students.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No students enrolled in this section.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>USN</th>
                      <th>Student Name</th>
                      <th>Institutional Email</th>
                      <th>Phone</th>
                      <th>Account Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((stu) => (
                      <tr key={stu.usn}>
                        <td>
                          <span className="usn-badge">{stu.usn}</span>
                        </td>
                        <td>
                          <strong>{stu.name}</strong>
                        </td>
                        <td>{stu.email}</td>
                        <td>{stu.phone || 'Not provided'}</td>
                        <td>
                          <span className={`badge ${stu.status === 'active' ? 'badge-active' : 'badge-disabled'}`}>
                            {stu.status === 'active' ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Marking & History */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Log Class Attendance &bull; {currentClass?.department} Year {currentClass?.year} (Section {currentClass?.section})
              </h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveAttendance}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="attendance-date">
                      Session Date <span className="required">*</span>
                    </label>
                    <input
                      id="attendance-date"
                      type="date"
                      className="form-input"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="attendance-subject">
                      Subject / Topic
                    </label>
                    <input
                      id="attendance-subject"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Deep Learning - Lecture 12"
                      value={attendanceSubject}
                      onChange={(e) => setAttendanceSubject(e.target.value)}
                    />
                  </div>
                </div>

                {/* Batch toggles */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    Student Roll Call:
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => markAllAttendance('present')}
                    >
                      Mark All Present
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => markAllAttendance('absent')}
                    >
                      Mark All Absent
                    </button>
                  </div>
                </div>

                <div className="table-wrapper" style={{ marginBottom: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>USN</th>
                        <th>Student Name</th>
                        <th style={{ textAlign: 'center' }}>Attendance Status</th>
                        <th style={{ textAlign: 'center' }}>Toggle Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((stu) => {
                        const isPresent = attendanceState[stu.usn] === 'present';
                        return (
                          <tr key={stu.usn}>
                            <td>
                              <span className="usn-badge">{stu.usn}</span>
                            </td>
                            <td>
                              <strong>{stu.name}</strong>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${isPresent ? 'badge-active' : 'badge-disabled'}`}>
                                {isPresent ? 'Present' : 'Absent'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className={`btn btn-sm ${isPresent ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={() => toggleStudentAttendance(stu.usn)}
                              >
                                {isPresent ? 'Mark Absent' : 'Mark Present'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingAttendance || students.length === 0}
                  >
                    <Save size={16} />
                    {savingAttendance ? 'Saving Attendance...' : 'Save Class Attendance'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Past attendance history for this class */}
          {attendanceHistory.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Past Attendance Sessions Logged</h3>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Present Count</th>
                        <th>Total Students</th>
                        <th>Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.map((att) => {
                        const present = Object.values(att.records).filter((v) => v === 'present').length;
                        const total = Object.values(att.records).length;
                        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                        return (
                          <tr key={att.id}>
                            <td>
                              <strong>{att.date}</strong>
                            </td>
                            <td>{att.subject || 'Regular Session'}</td>
                            <td>{present}</td>
                            <td>{total}</td>
                            <td>
                              <span className={`badge ${pct >= 75 ? 'badge-active' : 'badge-disabled'}`}>
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Marks Recording */}
      {activeTab === 'marks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Record Marks &bull; {currentClass?.department} Year {currentClass?.year} (Section {currentClass?.section})
              </h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveMarks}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="assessment-title">
                      Assessment Title <span className="required">*</span>
                    </label>
                    <input
                      id="assessment-title"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Internal Test 1 or Quiz 2"
                      value={assessmentTitle}
                      onChange={(e) => setAssessmentTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="max-marks">
                      Maximum Marks <span className="required">*</span>
                    </label>
                    <input
                      id="max-marks"
                      type="number"
                      min="1"
                      max="1000"
                      className="form-input"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="table-wrapper" style={{ marginBottom: '1.5rem' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>USN</th>
                        <th>Student Name</th>
                        <th style={{ width: '180px' }}>Marks Scored (Out of {maxMarks})</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((stu) => {
                        const score = marksState[stu.usn] ?? 0;
                        const pct = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;
                        const isInvalid = score < 0 || score > maxMarks;

                        return (
                          <tr key={stu.usn}>
                            <td>
                              <span className="usn-badge">{stu.usn}</span>
                            </td>
                            <td>
                              <strong>{stu.name}</strong>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                className="form-input"
                                style={{
                                  width: '120px',
                                  borderColor: isInvalid ? 'var(--color-danger)' : undefined,
                                }}
                                value={score}
                                onChange={(e) => handleScoreChange(stu.usn, e.target.value)}
                                required
                              />
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                {isInvalid ? (
                                  <span style={{ color: 'var(--color-danger)' }}>Exceeds Max!</span>
                                ) : (
                                  `${pct}%`
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingMarks || students.length === 0}
                  >
                    <Save size={16} />
                    {savingMarks ? 'Recording Marks...' : 'Save Marks'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Past Marks Logged */}
          {marksHistory.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Past Recorded Evaluations</h3>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Assessment</th>
                        <th>Max Marks</th>
                        <th>Students Evaluated</th>
                        <th>Average Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marksHistory.map((m) => {
                        const scores = Object.values(m.records);
                        const avg = scores.length > 0
                          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                          : 0;
                        return (
                          <tr key={m.id}>
                            <td>
                              <strong>{m.assessmentTitle}</strong>
                            </td>
                            <td>{m.maxMarks}</td>
                            <td>{scores.length}</td>
                            <td>
                              {avg} / {m.maxMarks} ({m.maxMarks > 0 ? Math.round((avg / m.maxMarks) * 100) : 0}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Assignments */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Create Assignment Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                Create New Assignment for {currentClass?.department} Year {currentClass?.year} ({currentClass?.section})
              </h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateAssignment}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="asg-title">
                      Assignment Title <span className="required">*</span>
                    </label>
                    <input
                      id="asg-title"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Heuristic Search Algorithms Practice"
                      value={newAsgTitle}
                      onChange={(e) => setNewAsgTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="asg-due-date">
                      Due Date <span className="required">*</span>
                    </label>
                    <input
                      id="asg-due-date"
                      type="date"
                      className="form-input"
                      value={newAsgDueDate}
                      onChange={(e) => setNewAsgDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="asg-desc">
                    Short Description / Submission Guidelines
                  </label>
                  <textarea
                    id="asg-desc"
                    className="form-textarea"
                    rows={3}
                    placeholder="Provide instructions, questions, or formatting requirements..."
                    value={newAsgDescription}
                    onChange={(e) => setNewAsgDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={savingAssignment}>
                    <Plus size={16} />
                    {savingAssignment ? 'Publishing...' : 'Publish Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List of Existing Class Assignments */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                Published Assignments ({assignments.length})
              </h3>
            </div>
            <div className="card-body">
              {assignments.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                  No assignments have been published for this section yet. Use the form above to add one.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {assignments.map((asg) => (
                    <div
                      key={asg.id}
                      style={{
                        padding: '1.25rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-bg-surface)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                            {asg.title}
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Target: {asg.department} - Year {asg.year} (Section {asg.section}) &bull; By: {asg.facultyName}
                          </span>
                        </div>
                        <span className="badge badge-primary">Due: {asg.dueDate}</span>
                      </div>
                      {asg.description && (
                        <p style={{ fontSize: '0.875rem', marginTop: '0.65rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                          {asg.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
