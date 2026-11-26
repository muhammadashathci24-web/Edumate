import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/Alert';
import { Student, Assignment, AttendanceRecord, MarkRecord, ClassSection, Course, AttendanceConfig } from '../../lib/types';
import {
  analyzeAttendanceByCourseSection,
  formatAttendancePercentage,
  StudentAttendanceSession,
} from '../../lib/attendanceAnalysis';
import {
  analyzeMarksByCourseSection,
  formatMarksValue,
  INTERNAL_MAX_MARKS,
  StudentMarkEntry,
} from '../../lib/marksAnalysis';
import { Users, BookOpen, CalendarCheck, Award, Plus, Save } from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { profile, token } = useAuth();
  const assignedClasses: ClassSection[] = profile?.assignedClasses || [];

  // Currently selected class (defaults to first assigned class)
  const [selectedClassIndex, setSelectedClassIndex] = useState<number>(0);
  const currentClass: ClassSection | undefined = assignedClasses[selectedClassIndex];

  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'marks' | 'assignments'>('students');

  // Class data
  const [students, setStudents] = useState<Student[]>([]);
  const [sectionCourses, setSectionCourses] = useState<Course[]>([]);
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>({
    requiredAttendancePercentage: null,
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [marksHistory, setMarksHistory] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  // --- Attendance Tab State ---
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>('');
  const [attendanceSubject, setAttendanceSubject] = useState<string>('');
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});
  const [savingAttendance, setSavingAttendance] = useState<boolean>(false);

  // --- Marks Tab State ---
  const [selectedMarksCourseCode, setSelectedMarksCourseCode] = useState<string>('');
  const [selectedInternalNumber, setSelectedInternalNumber] = useState<1 | 2 | 3>(3);
  const [assessmentTitle, setAssessmentTitle] = useState<string>('');
  const [maxMarks, setMaxMarks] = useState<number>(INTERNAL_MAX_MARKS);
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

      // 4. Courses & institutional attendance policy
      const crsRes = await fetch(`/api/courses?department=${department}&year=${year}&section=${section}`);
      if (crsRes.ok) {
        const crsData: Course[] = await crsRes.json();
        setSectionCourses(crsData || []);
        const assignedForFaculty = (crsData || []).filter(
          (c) =>
            (profile?.uid && c.facultyIds?.includes(profile.uid)) ||
            (profile?.courseCodes && profile.courseCodes.includes(c.code))
        );
        setSelectedCourseCode(assignedForFaculty[0]?.code || '');
        setSelectedMarksCourseCode(assignedForFaculty[0]?.code || '');
      }

      const attCfgRes = await fetch('/api/attendance-config');
      if (attCfgRes.ok) {
        setAttendanceConfig(await attCfgRes.json());
      }

      // 5. Marks
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

  const assignedSectionCourses = useMemo(() => {
    return sectionCourses.filter(
      (c) =>
        (profile?.uid && c.facultyIds?.includes(profile.uid)) ||
        (profile?.courseCodes && profile.courseCodes.includes(c.code))
    );
  }, [sectionCourses, profile?.uid, profile?.courseCodes]);

  // Per-student attendance warning summary for the currently selected course-section
  const studentWarningRows = useMemo(() => {
    if (!currentClass || students.length === 0) return [];
    const activeCourse =
      assignedSectionCourses.find((c) => c.code === selectedCourseCode) ||
      assignedSectionCourses[0] ||
      null;

    const relevantHistory = activeCourse
      ? attendanceHistory.filter((att) => {
          if (att.courseCode) {
            return att.courseCode.toUpperCase() === activeCourse.code.toUpperCase();
          }
          const sub = (att.subject || '').toLowerCase();
          return (
            sub === activeCourse.code.toLowerCase() ||
            sub === activeCourse.title.toLowerCase() ||
            sub.startsWith(`${activeCourse.code.toLowerCase()} `) ||
            sub.startsWith(`${activeCourse.code.toLowerCase()}-`) ||
            sub.startsWith(`${activeCourse.code.toLowerCase()}:`)
          );
        })
      : attendanceHistory;

    const courseList = activeCourse ? [activeCourse] : [];

    return students.map((stu) => {
      const sessions: StudentAttendanceSession[] = relevantHistory.map((att) => ({
        id: att.id,
        date: att.date,
        weekNumber: att.weekNumber,
        department: att.department,
        year: att.year,
        section: att.section,
        subject: att.subject,
        courseCode: att.courseCode,
        status: att.records[stu.usn] || 'not recorded',
      }));
      const analyses = analyzeAttendanceByCourseSection(
        sessions,
        courseList,
        {
          department: currentClass.department,
          year: currentClass.year,
          section: currentClass.section,
        },
        attendanceConfig.requiredAttendancePercentage,
        {
          semesterWeeks: attendanceConfig.semesterWeeks,
          semesterStartDate: attendanceConfig.semesterStartDate,
          timetable: attendanceConfig.timetable,
        }
      );
      return {
        student: stu,
        analysis: analyses[0] || null,
      };
    });
  }, [
    currentClass,
    students,
    assignedSectionCourses,
    selectedCourseCode,
    attendanceHistory,
    attendanceConfig.requiredAttendancePercentage,
    attendanceConfig.semesterWeeks,
    attendanceConfig.semesterStartDate,
    attendanceConfig.timetable,
  ]);

  // Per-student internal marks warning summary for the active course-section
  const studentMarksWarningRows = useMemo(() => {
    if (!currentClass || students.length === 0) return [];
    const activeCourse =
      assignedSectionCourses.find((c) => c.code === selectedMarksCourseCode) ||
      assignedSectionCourses[0] ||
      null;

    const relevantMarks = activeCourse
      ? marksHistory.filter((m) => {
          if (m.courseCode) {
            return m.courseCode.toUpperCase() === activeCourse.code.toUpperCase();
          }
          const titleLower = (m.assessmentTitle || '').toLowerCase();
          return (
            titleLower.includes(activeCourse.code.toLowerCase()) ||
            titleLower.includes(activeCourse.title.toLowerCase())
          );
        })
      : marksHistory;

    const courseList = activeCourse ? [activeCourse] : [];

    return students.map((stu) => {
      const entries: StudentMarkEntry[] = relevantMarks.map((m) => ({
        id: m.id,
        assessmentTitle: m.assessmentTitle,
        maxMarks: m.maxMarks,
        obtainedMarks: m.records[stu.usn] !== undefined ? m.records[stu.usn] : null,
        department: m.department,
        year: m.year,
        section: m.section,
        courseCode: m.courseCode,
        internalNumber: m.internalNumber,
      }));
      const analyses = analyzeMarksByCourseSection(entries, courseList, {
        department: currentClass.department,
        year: currentClass.year,
        section: currentClass.section,
      });
      return {
        student: stu,
        analysis: analyses[0] || null,
      };
    });
  }, [currentClass, students, assignedSectionCourses, selectedMarksCourseCode, marksHistory]);

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    if (!attendanceDate) {
      setFeedback({ type: 'danger', message: 'Please select a date for the attendance session.' });
      return;
    }

    const selectedCourse = assignedSectionCourses.find((c) => c.code === selectedCourseCode);
    const resolvedSubject = selectedCourse
      ? attendanceSubject.trim()
        ? `${selectedCourse.code} - ${selectedCourse.title} (${attendanceSubject.trim()})`
        : `${selectedCourse.code} - ${selectedCourse.title}`
      : attendanceSubject.trim() || 'General Session';

    setSavingAttendance(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          department: currentClass.department,
          year: currentClass.year,
          section: currentClass.section,
          date: attendanceDate,
          courseCode: selectedCourse?.code,
          subject: resolvedSubject,
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

      try {
        const channel = new BroadcastChannel('edumate_attendance');
        channel.postMessage({
          type: 'ATTENDANCE_CHANGED',
          department: currentClass.department,
          year: currentClass.year,
          section: currentClass.section,
        });
        channel.close();
      } catch {
        // ignore
      }

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

    const selectedCourse = assignedSectionCourses.find((c) => c.code === selectedMarksCourseCode);
    const resolvedTitle =
      assessmentTitle.trim() ||
      (selectedCourse
        ? `${selectedCourse.code} - Internal ${selectedInternalNumber}`
        : `Internal ${selectedInternalNumber}`);

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
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          department: currentClass.department,
          year: currentClass.year,
          section: currentClass.section,
          courseCode: selectedCourse?.code,
          internalNumber: selectedInternalNumber,
          assessmentTitle: resolvedTitle,
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
        message: `Marks for "${resolvedTitle}" in ${currentClass.department} Year ${currentClass.year} (${currentClass.section}) recorded successfully!`,
      });

      setAssessmentTitle('');

      try {
        const channel = new BroadcastChannel('edumate_attendance');
        channel.postMessage({
          type: 'MARKS_CHANGED',
          department: currentClass.department,
          year: currentClass.year,
          section: currentClass.section,
        });
        channel.close();
      } catch {
        // ignore
      }

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

                  {assignedSectionCourses.length > 0 && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="attendance-course">
                        Assigned Course <span className="required">*</span>
                      </label>
                      <select
                        id="attendance-course"
                        className="form-select"
                        value={selectedCourseCode}
                        onChange={(e) => setSelectedCourseCode(e.target.value)}
                      >
                        {assignedSectionCourses.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="attendance-subject">
                      {assignedSectionCourses.length > 0 ? 'Session Topic (Optional)' : 'Subject / Topic'}
                    </label>
                    <input
                      id="attendance-subject"
                      type="text"
                      className="form-input"
                      placeholder={
                        assignedSectionCourses.length > 0
                          ? 'e.g. Lecture 12'
                          : 'e.g. Deep Learning - Lecture 12'
                      }
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

          {/* Section Attendance Warnings Summary (per assigned course-section) */}
          {students.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    Course-Section Attendance Warnings &amp; Trend Estimates
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                    {selectedCourseCode ? `${selectedCourseCode} • ` : ''}
                    {currentClass?.department} Year {currentClass?.year} (Section {currentClass?.section})
                    {typeof attendanceConfig.requiredAttendancePercentage === 'number'
                      ? ` — Official requirement: ${formatAttendancePercentage(attendanceConfig.requiredAttendancePercentage)}`
                      : ' — Official requirement not configured by admin yet'}
                  </p>
                </div>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>USN</th>
                        <th>Student</th>
                        <th>Attended / Held</th>
                        <th>Current %</th>
                        <th>Safe Absences Left</th>
                        <th>Weekly Trend (Estimate Only)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentWarningRows.map(({ student, analysis }) => {
                        const pctText =
                          analysis?.currentPercentage !== null && analysis?.currentPercentage !== undefined
                            ? formatAttendancePercentage(analysis.currentPercentage)
                            : 'N/A';
                        const safeText = analysis?.threshold
                          ? analysis.threshold.safeAbsences !== null
                            ? `${analysis.threshold.safeAbsences}`
                            : 'No data'
                          : 'Pending policy';

                        return (
                          <tr key={student.usn}>
                            <td>
                              <span className="usn-badge">{student.usn}</span>
                            </td>
                            <td>
                              <strong>{student.name}</strong>
                            </td>
                            <td>
                              {analysis ? `${analysis.attended} / ${analysis.held}` : '0 / 0'}
                            </td>
                            <td>
                              {analysis?.threshold ? (
                                <span
                                  className={`badge ${
                                    analysis.threshold.status === 'below_threshold'
                                      ? 'badge-disabled'
                                      : analysis.threshold.status === 'at_limit'
                                      ? 'badge-warning'
                                      : analysis.threshold.status === 'safe'
                                      ? 'badge-active'
                                      : ''
                                  }`}
                                >
                                  {pctText}
                                </span>
                              ) : (
                                pctText
                              )}
                            </td>
                            <td>{safeText}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              {analysis?.regression.hasEnoughHistory && analysis.regression.projectedSummary
                                ? analysis.regression.projectedSummary
                                : analysis?.regression.summary || 'More attendance history is needed for a trend forecast'}
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
                        const reqPct = attendanceConfig.requiredAttendancePercentage;
                        return (
                          <tr key={att.id}>
                            <td>
                              <strong>{att.date}</strong>
                            </td>
                            <td>{att.subject || 'Regular Session'}</td>
                            <td>{present}</td>
                            <td>{total}</td>
                            <td>
                              <span
                                className={`badge ${
                                  typeof reqPct === 'number'
                                    ? pct >= reqPct
                                      ? 'badge-active'
                                      : 'badge-disabled'
                                    : ''
                                }`}
                              >
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  {assignedSectionCourses.length > 0 && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="marks-course">
                        Assigned Course <span className="required">*</span>
                      </label>
                      <select
                        id="marks-course"
                        className="form-select"
                        value={selectedMarksCourseCode}
                        onChange={(e) => setSelectedMarksCourseCode(e.target.value)}
                      >
                        {assignedSectionCourses.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="marks-internal-number">
                      Internal Assessment <span className="required">*</span>
                    </label>
                    <select
                      id="marks-internal-number"
                      className="form-select"
                      value={selectedInternalNumber}
                      onChange={(e) => setSelectedInternalNumber(Number(e.target.value) as 1 | 2 | 3)}
                    >
                      <option value={1}>Internal 1 (of 3)</option>
                      <option value={2}>Internal 2 (of 3)</option>
                      <option value={3}>Internal 3 (of 3)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="assessment-title">
                      Assessment Title (Optional)
                    </label>
                    <input
                      id="assessment-title"
                      type="text"
                      className="form-input"
                      placeholder={
                        selectedMarksCourseCode
                          ? `${selectedMarksCourseCode} - Internal ${selectedInternalNumber}`
                          : `Internal ${selectedInternalNumber}`
                      }
                      value={assessmentTitle}
                      onChange={(e) => setAssessmentTitle(e.target.value)}
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
                      max="100"
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

          {/* Section Internal Marks Eligibility Summary */}
          {students.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    Internal Marks Eligibility Summary (12/30 Target)
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                    {selectedMarksCourseCode ? `${selectedMarksCourseCode} • ` : ''}
                    {currentClass?.department} Year {currentClass?.year} (Section {currentClass?.section})
                  </p>
                </div>
              </div>
              <div className="card-body">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>USN</th>
                        <th>Student</th>
                        <th>Recorded Internals</th>
                        <th>Current / Final Avg</th>
                        <th>Remaining Avg Needed</th>
                        <th>Status / Forecast</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentMarksWarningRows.map(({ student, analysis }) => {
                        const avg = analysis?.isFinal
                          ? analysis.actualFinalAverage
                          : analysis?.currentAverage;
                        return (
                          <tr key={student.usn}>
                            <td>
                              <span className="usn-badge">{student.usn}</span>
                            </td>
                            <td>
                              <strong>{student.name}</strong>
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>
                              {analysis && analysis.recordedInternals.length > 0
                                ? analysis.recordedInternals
                                    .map((r) => `IA${r.internalNumber}: ${formatMarksValue(r.score)}/30`)
                                    .join(', ')
                                : 'None'}
                            </td>
                            <td>
                              {avg !== null && avg !== undefined
                                ? `${formatMarksValue(avg)} / 30`
                                : 'N/A'}
                            </td>
                            <td>
                              {analysis
                                ? analysis.isFinal
                                  ? 'Completed (3/3)'
                                  : analysis.cannotReachTarget
                                  ? `${formatMarksValue(analysis.rawRequiredRemainingAverage!)} (> 30 max)`
                                  : `${formatMarksValue(analysis.requiredRemainingAverage!)} / 30`
                                : 'N/A'}
                            </td>
                            <td style={{ fontSize: '0.8rem' }}>
                              {analysis?.statusLabel || 'N/A'}
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
