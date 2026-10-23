import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { Alert } from '../../components/Alert';
import { Assignment, Course } from '../../lib/types';
import { User, BookOpen, CalendarCheck, Award, Mail, Phone, ShieldAlert, GraduationCap, AlertTriangle } from 'lucide-react';

interface AttendanceItem {
  id: string;
  date: string;
  subject?: string;
  status: 'present' | 'absent' | 'not recorded';
}

interface MarkItem {
  id: string;
  assessmentTitle: string;
  maxMarks: number;
  obtainedMarks: number | null;
}

export const StudentDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'assignments' | 'attendance' | 'marks'>('overview');
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [marks, setMarks] = useState<MarkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.usn) {
      setLoading(false);
      return;
    }

    const loadStudentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/student/dashboard-data/${encodeURIComponent(profile.usn!)}`);
        if (!res.ok) {
          throw new Error('Could not load student academic data.');
        }
        const data = await res.json();
        setCourses(data.courses || []);
        setAssignments(data.assignments || []);
        setAttendance(data.attendance || []);
        setMarks(data.marks || []);
      } catch (err: any) {
        console.error('Student data fetch error:', err);
        setError(err.message || 'Failed to load records.');
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [profile?.usn]);

  // Attendance statistics calculation
  const recordedAttendance = attendance.filter((a) => a.status === 'present' || a.status === 'absent');
  const presentCount = recordedAttendance.filter((a) => a.status === 'present').length;
  const attendancePercentage = recordedAttendance.length > 0
    ? Math.round((presentCount / recordedAttendance.length) * 100)
    : null;

  if (loading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-text-muted)' }}>
        <p style={{ fontWeight: 600 }}>Loading academic profile records...</p>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 className="page-title">Student Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, {profile?.name}. View your academic profile, assignments, attendance, and marks.
            </p>
          </div>
          {profile?.isDemo && (
            <span className="badge badge-demo">Demo Student Account</span>
          )}
        </div>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError(null)} />}

      {/* Tabs */}
      <nav className="tabs-nav" aria-label="Student sections">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Profile Overview
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <GraduationCap size={16} /> Enrolled Courses ({courses.length})
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments ({assignments.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance ({recordedAttendance.length} Sessions)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'marks' ? 'active' : ''}`}
          onClick={() => setActiveTab('marks')}
        >
          Marks & Evaluations ({marks.length})
        </button>
      </nav>

      {/* Tab 1: Profile Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Profile Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} style={{ color: 'var(--color-primary)' }} />
                <h2 className="card-title">My Student Profile</h2>
              </div>
              <span className="badge badge-student">Verified Student</span>
            </div>
            <div className="card-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                <div>
                  <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>
                    Full Name
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.2rem' }}>
                    {profile?.name}
                  </div>
                </div>

                <div>
                  <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>
                    University Seat Number (USN)
                  </span>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span className="usn-badge">{profile?.usn || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>
                    Department & Class Section
                  </span>
                  <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.2rem' }}>
                    {profile?.department} &bull; Year {profile?.year} (Section {profile?.section})
                  </div>
                </div>

                <div>
                  <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>
                    College Email
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', color: 'var(--color-text-main)' }}>
                    <Mail size={16} style={{ color: 'var(--color-text-subtle)' }} />
                    <span>{profile?.email}</span>
                  </div>
                </div>

                <div>
                  <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>
                    Contact Phone
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', color: 'var(--color-text-main)' }}>
                    <Phone size={16} style={{ color: 'var(--color-text-subtle)' }} />
                    <span>{profile?.phone || 'Not provided'}</span>
                  </div>
                </div>

                <div>
                  <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)' }}>
                    Account Status
                  </span>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span className={`badge ${profile?.status === 'active' ? 'badge-active' : 'badge-disabled'}`}>
                      {profile?.status === 'active' ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security info box */}
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: 'var(--color-bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                <ShieldAlert size={16} style={{ color: 'var(--color-info)', flexShrink: 0 }} />
                <span>
                  Profile data, USN, and class allocations are officially maintained by the College Administration.
                  Students cannot modify these records.
                </span>
              </div>
            </div>
          </div>

          {/* Key Metric Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <GraduationCap size={26} style={{ color: 'var(--color-primary)', margin: '0 auto 0.4rem auto' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  {courses.length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Enrolled Courses
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <CalendarCheck size={26} style={{ color: 'var(--color-secondary)', margin: '0 auto 0.4rem auto' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  {attendancePercentage !== null ? `${attendancePercentage}%` : 'N/A'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Attendance Rate
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <BookOpen size={26} style={{ color: '#0284c7', margin: '0 auto 0.4rem auto' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  {assignments.length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Class Assignments
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '1.25rem' }}>
                <Award size={26} style={{ color: '#d97706', margin: '0 auto 0.4rem auto' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  {marks.length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Evaluated Marks
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Enrolled Courses */}
      {activeTab === 'courses' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={20} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h2 className="card-title">
                  My Enrolled Courses ({profile?.department} &bull; Year {profile?.year} Section {profile?.section})
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                  Official semester courses registered for your section.
                </p>
              </div>
            </div>
            <span className="badge badge-demo">8 Courses</span>
          </div>

          <div className="card-body">
            {/* Disclaimer notice */}
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.85rem 1rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                fontSize: '0.82rem',
                color: '#92400e',
              }}
            >
              <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Demo Notice:</strong> Faculty names and instructor assignments below are fictional demo data for demonstration purposes only. Machine Learning Laboratory (<code>BAI505L</code>) is co-instructed by Dr. Dev Arin and Mrs. Nila Varen.
              </div>
            </div>

            {courses.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={40} />}
                title="No Courses Enrolled"
                description="No active course catalog entries found for your department and year."
              />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Course Code</th>
                      <th>Course Title</th>
                      <th>Type / Credits</th>
                      <th>Course Instructor(s)</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => {
                      const isMulti = Boolean(course.facultyNames && course.facultyNames.length > 1);
                      return (
                        <tr key={course.code}>
                          <td>
                            <span className="usn-badge" style={{ fontWeight: 700 }}>
                              {course.code}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                              {course.title}
                            </div>
                            {course.isDemo && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                Fictional Demo Course
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                              {course.type}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {course.credits} Credits
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {course.facultyNames?.map((fn, idx) => (
                                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{fn}</span>
                                  {isMulti && (
                                    <span
                                      className="badge"
                                      style={{
                                        fontSize: '0.68rem',
                                        backgroundColor: '#e0f2fe',
                                        color: '#0369a1',
                                        padding: '0.1rem 0.35rem',
                                      }}
                                    >
                                      Co-Instructor {idx + 1}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {isMulti && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                  Single lab course shared between both instructors
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="badge badge-active">Enrolled</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Assignments */}
      {activeTab === 'assignments' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: 'var(--color-primary)' }} />
              <h2 className="card-title">
                Assignments for {profile?.department} Year {profile?.year} (Section {profile?.section})
              </h2>
            </div>
          </div>
          <div className="card-body">
            {assignments.length === 0 ? (
              <EmptyState
                title="No Assignments Added Yet"
                description="Your faculty has not posted any assignments for this class section yet. Check back soon."
              />
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                          {asg.title}
                        </h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                          Posted by: <strong>{asg.facultyName}</strong>
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: 'var(--color-bg-subtle)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#475569',
                        }}
                      >
                        Due: {asg.dueDate}
                      </div>
                    </div>
                    {asg.description && (
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--color-text-main)',
                          marginTop: '0.75rem',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {asg.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Attendance */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={20} style={{ color: 'var(--color-secondary)' }} />
              <h2 className="card-title">My Attendance History</h2>
            </div>
            {attendancePercentage !== null && (
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: attendancePercentage >= 75 ? 'var(--color-success)' : 'var(--color-danger)',
                }}
              >
                Overall: {attendancePercentage}% ({presentCount}/{recordedAttendance.length} sessions)
              </span>
            )}
          </div>
          <div className="card-body">
            {attendance.length === 0 ? (
              <EmptyState
                title="No Attendance Records Found"
                description="Attendance sessions for your class section have not been logged yet by your faculty."
              />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Subject / Session</th>
                      <th>Class & Section</th>
                      <th>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((att) => (
                      <tr key={att.id}>
                        <td>
                          <strong>{att.date}</strong>
                        </td>
                        <td>{att.subject || 'Regular Session'}</td>
                        <td>
                          {profile?.department} - Year {profile?.year} ({profile?.section})
                        </td>
                        <td>
                          {att.status === 'present' ? (
                            <span className="badge badge-active">Present</span>
                          ) : att.status === 'absent' ? (
                            <span className="badge badge-disabled">Absent</span>
                          ) : (
                            <span className="badge">Not Recorded</span>
                          )}
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

      {/* Tab 4: Marks */}
      {activeTab === 'marks' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} style={{ color: '#d97706' }} />
              <h2 className="card-title">My Marks & Assessments</h2>
            </div>
          </div>
          <div className="card-body">
            {marks.length === 0 ? (
              <EmptyState
                title="No Marks Records Found"
                description="Evaluations or internal marks for your class have not been published yet."
              />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Assessment Title</th>
                      <th>Marks Obtained</th>
                      <th>Maximum Marks</th>
                      <th>Percentage</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.map((mrk) => {
                      const score = mrk.obtainedMarks;
                      const pct = score !== null && mrk.maxMarks > 0
                        ? Math.round((score / mrk.maxMarks) * 100)
                        : null;

                      return (
                        <tr key={mrk.id}>
                          <td>
                            <strong>{mrk.assessmentTitle}</strong>
                          </td>
                          <td>
                            {score !== null ? (
                              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{score}</span>
                            ) : (
                              <span style={{ color: 'var(--color-text-subtle)' }}>Pending / Absent</span>
                            )}
                          </td>
                          <td>{mrk.maxMarks}</td>
                          <td>{pct !== null ? `${pct}%` : 'N/A'}</td>
                          <td>
                            {pct !== null ? (
                              <span
                                className={`badge ${
                                  pct >= 75
                                    ? 'badge-active'
                                    : pct >= 50
                                    ? 'badge-demo'
                                    : 'badge-disabled'
                                }`}
                              >
                                {pct >= 75 ? 'Distinction' : pct >= 50 ? 'Passing' : 'Needs Attention'}
                              </span>
                            ) : (
                              <span className="badge">Unevaluated</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
