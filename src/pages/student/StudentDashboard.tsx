import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { Alert } from '../../components/Alert';
import { Assignment, Course, StudentInterests, Opportunity, AttendanceConfig } from '../../lib/types';
import { matchOpportunities } from '../../lib/recommendations';
import {
  analyzeAttendanceByCourseSection,
  formatAttendancePercentage,
  StudentAttendanceSession,
} from '../../lib/attendanceAnalysis';
import {
  analyzeMarksByCourseSection,
  StudentMarkEntry,
} from '../../lib/marksAnalysis';
import { AttendanceWarningsSection } from '../../components/AttendanceWarningsSection';
import { MarksWarningsSection } from '../../components/MarksWarningsSection';
import {
  User,
  BookOpen,
  CalendarCheck,
  Award,
  Mail,
  Phone,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  MapPin,
  Compass,
  Edit2,
  ArrowRight,
} from 'lucide-react';
import { InterestsQuestionnaireModal } from '../../components/InterestsQuestionnaireModal';
import { RecommendationsTab } from './RecommendationsTab';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AttendanceItem {
  id: string;
  date: string;
  weekNumber?: number;
  department?: string;
  year?: number;
  section?: string;
  subject?: string;
  courseCode?: string;
  status: 'present' | 'absent' | 'not recorded';
}

interface MarkItem {
  id: string;
  department?: string;
  year?: number;
  section?: string;
  courseCode?: string;
  internalNumber?: number;
  assessmentTitle: string;
  maxMarks: number;
  obtainedMarks: number | null;
}

export const StudentDashboard: React.FC = () => {
  const { profile, token, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'courses' | 'assignments' | 'attendance' | 'marks'>('overview');
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [attendanceCourseFilter, setAttendanceCourseFilter] = useState<string>('ALL');
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>({
    requiredAttendancePercentage: null,
  });
  const [marks, setMarks] = useState<MarkItem[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppsLoading, setOppsLoading] = useState<boolean>(true);
  const [oppsError, setOppsError] = useState<string | null>(null);
  const [studentInterests, setStudentInterests] = useState<StudentInterests | null>(profile?.interests || null);
  const [isInterestsModalOpen, setIsInterestsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time synchronization for active campus opportunities & events
  useEffect(() => {
    let isMounted = true;
    let unsubscribeFirestore: (() => void) | null = null;
    let bc: BroadcastChannel | null = null;
    let eventSource: EventSource | null = null;

    const fetchOpportunitiesFromApi = async () => {
      try {
        const oppRes = await fetch('/api/opportunities');
        if (!oppRes.ok) {
          throw new Error('Could not load opportunities catalog.');
        }
        const data = await oppRes.json();
        if (isMounted) {
          setOpportunities(data);
          setOppsLoading(false);
          setOppsError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[Opportunities] Fetch error:', err);
          setOppsError(err.message || 'Failed to load opportunities.');
          setOppsLoading(false);
        }
      }
    };

    // 1. Initial fetch from API to ensure instant population
    fetchOpportunitiesFromApi();

    // 2. Set up Firestore real-time listener if db is initialized
    if (db) {
      try {
        const oppsCol = collection(db, 'opportunities');
        const q = query(oppsCol, where('isActive', '==', true));
        unsubscribeFirestore = onSnapshot(
          q,
          (snapshot) => {
            if (!isMounted) return;
            const liveOpps: Opportunity[] = [];
            snapshot.forEach((docSnap) => {
              liveOpps.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });
            setOpportunities(liveOpps);
            setOppsLoading(false);
            setOppsError(null);
          },
          (err) => {
            console.warn('[Firestore] Opportunities listener fallback:', err.message);
            if (isMounted) {
              fetchOpportunitiesFromApi();
            }
          }
        );
      } catch (err) {
        console.warn('[Firestore] Error attaching snapshot listener:', err);
      }
    }

    // 3. Cross-tab synchronization via BroadcastChannel
    try {
      bc = new BroadcastChannel('edumate_opportunities');
      bc.onmessage = (event) => {
        if (!isMounted) return;
        if (event.data?.type === 'OPPORTUNITIES_CHANGED') {
          fetchOpportunitiesFromApi();
        }
      };
    } catch {
      // Ignore if unsupported
    }

    // 4. Server-Sent Events (SSE) stream for backend real-time updates
    try {
      eventSource = new EventSource('/api/opportunities/stream');
      eventSource.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'OPPORTUNITIES_CHANGED') {
            fetchOpportunitiesFromApi();
          }
        } catch {
          fetchOpportunitiesFromApi();
        }
      };
      eventSource.onerror = () => {
        // SSE auto-reconnects
      };
    } catch {
      // Ignore if unsupported
    }

    return () => {
      isMounted = false;
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      if (bc) {
        bc.close();
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!profile?.usn) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let bc: BroadcastChannel | null = null;
    let eventSource: EventSource | null = null;

    const loadStudentData = async (showSpinner = true) => {
      if (showSpinner && isMounted) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(`/api/student/dashboard-data/${encodeURIComponent(profile.usn!)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          throw new Error('Could not load student academic data.');
        }
        const data = await res.json();
        if (!isMounted) return;
        setCourses(data.courses || []);
        setAssignments(data.assignments || []);
        setAttendance(data.attendance || []);
        setMarks(data.marks || []);
        if (data.attendanceConfig) {
          setAttendanceConfig(data.attendanceConfig);
        }
        if (data.student?.interests) {
          setStudentInterests(data.student.interests);
        }
      } catch (err: any) {
        console.error('Student data fetch error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load records.');
        }
      } finally {
        if (showSpinner && isMounted) {
          setLoading(false);
        }
      }
    };

    loadStudentData(true);

    try {
      bc = new BroadcastChannel('edumate_attendance');
      bc.onmessage = () => {
        if (isMounted) {
          loadStudentData(false);
        }
      };
    } catch {
      // ignore if unsupported
    }

    try {
      eventSource = new EventSource('/api/attendance/stream');
      eventSource.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(event.data);
          if (
            payload?.type === 'ATTENDANCE_CHANGED' ||
            payload?.type === 'ATTENDANCE_CONFIG_CHANGED' ||
            payload?.type === 'MARKS_CHANGED'
          ) {
            loadStudentData(false);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore if unsupported
    }

    return () => {
      isMounted = false;
      if (bc) bc.close();
      if (eventSource) eventSource.close();
    };
  }, [profile?.usn, token]);

  const handleSaveInterests = async (newInterests: StudentInterests) => {
    if (!profile?.usn) return;
    const res = await fetch(`/api/student/interests/${encodeURIComponent(profile.usn)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: newInterests }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update student interests');
    }
    setStudentInterests(newInterests);
    if (refreshProfile) {
      await refreshProfile();
    }
  };

  // Attendance statistics calculation
  const recordedAttendance = attendance.filter((a) => a.status === 'present' || a.status === 'absent');
  const presentCount = recordedAttendance.filter((a) => a.status === 'present').length;
  const attendancePercentage = recordedAttendance.length > 0
    ? (presentCount / recordedAttendance.length) * 100
    : null;

  const normalizedAttendanceSessions: StudentAttendanceSession[] = useMemo(() => {
    return attendance.map((att) => ({
      id: att.id,
      date: att.date,
      weekNumber: att.weekNumber,
      department: att.department || profile?.department || '',
      year: att.year || profile?.year || 3,
      section: att.section || profile?.section || '',
      subject: att.subject,
      courseCode: att.courseCode,
      status: att.status,
    }));
  }, [attendance, profile?.department, profile?.year, profile?.section]);

  const courseSectionAnalyses = useMemo(() => {
    if (!profile?.department || !profile?.year || !profile?.section) return [];
    return analyzeAttendanceByCourseSection(
      normalizedAttendanceSessions,
      courses,
      {
        department: profile.department,
        year: profile.year,
        section: profile.section,
      },
      attendanceConfig.requiredAttendancePercentage,
      {
        semesterWeeks: attendanceConfig.semesterWeeks,
        semesterStartDate: attendanceConfig.semesterStartDate,
        timetable: attendanceConfig.timetable,
      }
    );
  }, [
    normalizedAttendanceSessions,
    courses,
    profile?.department,
    profile?.year,
    profile?.section,
    attendanceConfig.requiredAttendancePercentage,
    attendanceConfig.semesterWeeks,
    attendanceConfig.semesterStartDate,
    attendanceConfig.timetable,
  ]);

  const coursesAtRisk = useMemo(() => {
    return courseSectionAnalyses.filter(
      (a) =>
        a.threshold?.status === 'below_threshold' ||
        a.threshold?.status === 'at_limit' ||
        a.regression.projectedMeetsRequirement === false
    );
  }, [courseSectionAnalyses]);

  const normalizedMarksEntries: StudentMarkEntry[] = useMemo(() => {
    return marks.map((m) => ({
      id: m.id,
      assessmentTitle: m.assessmentTitle,
      maxMarks: m.maxMarks,
      obtainedMarks: m.obtainedMarks,
      department: m.department || profile?.department || '',
      year: m.year || profile?.year || 3,
      section: m.section || profile?.section || '',
      courseCode: m.courseCode,
      internalNumber: m.internalNumber,
    }));
  }, [marks, profile?.department, profile?.year, profile?.section]);

  const courseSectionMarksAnalyses = useMemo(() => {
    if (!profile?.department || !profile?.year || !profile?.section) return [];
    return analyzeMarksByCourseSection(normalizedMarksEntries, courses, {
      department: profile.department,
      year: profile.year,
      section: profile.section,
    });
  }, [normalizedMarksEntries, courses, profile?.department, profile?.year, profile?.section]);

  const marksAtRisk = useMemo(() => {
    return courseSectionMarksAnalyses.filter(
      (m) =>
        m.status === 'currently_below_target' ||
        m.status === 'projected_below_target' ||
        m.status === 'impossible_to_reach' ||
        m.status === 'final_below_target'
    );
  }, [courseSectionMarksAnalyses]);

  const filteredAttendanceHistory = useMemo(() => {
    if (attendanceCourseFilter === 'ALL') return attendance;
    const codeUpper = attendanceCourseFilter.toUpperCase();
    return attendance.filter(
      (att) =>
        att.courseCode?.toUpperCase() === codeUpper ||
        (att.subject || '').toUpperCase().startsWith(`${codeUpper} `) ||
        (att.subject || '').toUpperCase() === codeUpper
    );
  }, [attendance, attendanceCourseFilter]);

  // Average marks calculation for scholarship conditions
  const evaluatedMarks = marks.filter((m) => m.obtainedMarks !== null && m.maxMarks > 0);
  const totalObtained = evaluatedMarks.reduce((sum, m) => sum + (m.obtainedMarks || 0), 0);
  const totalMax = evaluatedMarks.reduce((sum, m) => sum + m.maxMarks, 0);
  const averageMarksPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;

  // Matched recommendations count using TF-IDF strict gate
  const matchedCount = useMemo(() => {
    if (!profile) return 0;
    const studentObj = {
      usn: profile.usn || '',
      uid: profile.uid,
      name: profile.name,
      email: profile.email,
      department: profile.department || '',
      year: profile.year || 3,
      section: profile.section || '',
      status: profile.status,
      interests: studentInterests || undefined,
    };
    const matches = matchOpportunities(studentObj, studentInterests, opportunities, averageMarksPercentage);
    return matches.length;
  }, [profile, studentInterests, opportunities, averageMarksPercentage]);

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
          className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} /> Recommended for You ({matchedCount})
          </span>
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

          {/* Interests & Opportunities Preferences Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <h2 className="card-title">My Interests & Opportunities Preferences</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Topics used to personalize your recommendations for events, competitions, workshops, and scholarships.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsInterestsModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
              >
                <Edit2 size={14} />
                {studentInterests && (studentInterests.categories?.length > 0 || studentInterests.subcategories?.length > 0) ? 'Edit Interests' : 'Set Interests'}
              </button>
            </div>
            <div className="card-body">
              {studentInterests && (studentInterests.categories?.length > 0 || studentInterests.subcategories?.length > 0 || (studentInterests.customInterests && studentInterests.customInterests.length > 0)) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Categories */}
                  {studentInterests.categories?.length > 0 && (
                    <div>
                      <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                        Interest Areas
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {studentInterests.categories.map((cat) => (
                          <span
                            key={cat}
                            className="badge badge-student"
                            style={{ fontSize: '0.825rem', padding: '0.3rem 0.65rem' }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subcategories */}
                  {studentInterests.subcategories?.length > 0 && (
                    <div>
                      <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                        Topics & Subcategories
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {studentInterests.subcategories.map((sub) => (
                          <span
                            key={sub}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              color: '#047857',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                            }}
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Interests */}
                  {studentInterests.customInterests && studentInterests.customInterests.length > 0 && (
                    <div>
                      <span className="form-label" style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                        Specialized Interests
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {studentInterests.customInterests.map((item) => (
                          <span
                            key={item}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '9999px',
                              backgroundColor: 'rgba(79, 70, 229, 0.08)',
                              color: 'var(--color-primary)',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location Preference & Recommendations Quick Link */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      <MapPin size={15} style={{ color: 'var(--color-info)' }} />
                      <span>Preferred Area / City: <strong>{studentInterests.preferredCity || 'Bengaluru'}</strong></span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setActiveTab('recommendations')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Sparkles size={14} /> View Recommendations ({matchedCount}) <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                  <Compass size={32} style={{ color: 'var(--color-primary)', opacity: 0.6, margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    No interests selected yet
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '480px', margin: '0 auto 1rem auto' }}>
                    Choose your interests in coding, sports, arts, workshops, or entrepreneurship to unlock tailored recommendations for upcoming opportunities and scholarships.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsInterestsModalOpen(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Sparkles size={16} /> Select Interests
                  </button>
                </div>
              )}
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
                  {attendancePercentage !== null ? formatAttendancePercentage(attendancePercentage) : 'N/A'}
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

          {coursesAtRisk.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--color-warning-border)', backgroundColor: 'var(--color-warning-bg)' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-warning)' }}>
                    Attendance Shortage Alert ({coursesAtRisk.length}{' '}
                    {coursesAtRisk.length === 1 ? 'course' : 'courses'} need attention)
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
                    {coursesAtRisk.map((c) => c.threshold?.explanation || c.displayName).join(' • ')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveTab('attendance')}
                >
                  View Attendance Warnings <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {marksAtRisk.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--color-danger-border)', backgroundColor: 'var(--color-danger-bg)' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-danger)' }}>
                    Internal Marks Eligibility Alert ({marksAtRisk.length}{' '}
                    {marksAtRisk.length === 1 ? 'course' : 'courses'} below or projected below 12/30)
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
                    {marksAtRisk.map((m) => `${m.courseCode || m.courseTitle}: ${m.statusLabel}`).join(' • ')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveTab('marks')}
                >
                  View Marks Warnings <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Recommended Opportunities */}
      {activeTab === 'recommendations' && profile && (
        <RecommendationsTab
          student={{
            usn: profile.usn || '',
            uid: profile.uid,
            name: profile.name,
            email: profile.email,
            department: profile.department || '',
            year: profile.year || 3,
            section: profile.section || '',
            status: profile.status,
            interests: studentInterests || undefined,
          }}
          interests={studentInterests}
          opportunities={opportunities}
          averageMarksPercentage={averageMarksPercentage}
          onOpenInterestsModal={() => setIsInterestsModalOpen(true)}
          isLoading={oppsLoading}
          error={oppsError}
        />
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
          </div>

          <div className="card-body">

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
                          </td>
                          <td>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                              {course.type}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Credits: {course.credits ? course.credits : 'Not provided'}
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
        <div>
          {profile && (
            <AttendanceWarningsSection
              sessions={normalizedAttendanceSessions}
              courses={courses}
              studentSection={{
                department: profile.department || '',
                year: profile.year || 3,
                section: profile.section || '',
              }}
              attendanceConfig={attendanceConfig}
            />
          )}

          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarCheck size={20} style={{ color: 'var(--color-secondary)' }} />
                <div>
                  <h2 className="card-title">My Attendance History (Two-Month Semester Log)</h2>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                    Showing {filteredAttendanceHistory.length} of {attendance.length} recorded class sessions
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <select
                  aria-label="Filter attendance history by course"
                  className="form-select"
                  style={{ width: 'auto', minWidth: '200px', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                  value={attendanceCourseFilter}
                  onChange={(e) => setAttendanceCourseFilter(e.target.value)}
                >
                  <option value="ALL">All Enrolled Courses ({attendance.length})</option>
                  {courses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
                {attendancePercentage !== null && (
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color:
                        typeof attendanceConfig.requiredAttendancePercentage === 'number'
                          ? attendancePercentage >= attendanceConfig.requiredAttendancePercentage
                            ? 'var(--color-success)'
                            : 'var(--color-danger)'
                          : 'var(--color-text-main)',
                    }}
                  >
                    Overall: {formatAttendancePercentage(attendancePercentage)} ({presentCount}/{recordedAttendance.length} sessions)
                  </span>
                )}
              </div>
            </div>
            <div className="card-body">
              {filteredAttendanceHistory.length === 0 ? (
                <EmptyState
                  title="No Attendance Records Found"
                  description="Attendance sessions for your class section have not been logged yet by your faculty."
                />
              ) : (
                <div className="table-wrapper" style={{ maxHeight: '480px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Date</th>
                        <th>Course / Subject</th>
                        <th>Class &amp; Section</th>
                        <th>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendanceHistory.map((att) => (
                        <tr key={att.id}>
                          <td>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                              {att.weekNumber ? `Week ${att.weekNumber}` : '—'}
                            </span>
                          </td>
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
        </div>
      )}

      {/* Tab 4: Marks */}
      {activeTab === 'marks' && (
        <div>
          {profile && (
            <MarksWarningsSection
              marks={normalizedMarksEntries}
              courses={courses}
              studentSection={{
                department: profile.department || '',
                year: profile.year || 3,
                section: profile.section || '',
              }}
            />
          )}

          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} style={{ color: '#d97706' }} />
                <h2 className="card-title">My Marks &amp; Assessments</h2>
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
                                      : pct >= 40
                                      ? 'badge-warning'
                                      : 'badge-disabled'
                                  }`}
                                >
                                  {pct >= 75 ? 'Distinction' : pct >= 40 ? 'Meets 12/30' : 'Below 12/30'}
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
        </div>
      )}

      {/* Interests Questionnaire Modal */}
      {profile?.usn && (
        <InterestsQuestionnaireModal
          isOpen={isInterestsModalOpen}
          onClose={() => setIsInterestsModalOpen(false)}
          currentInterests={studentInterests}
          onSave={handleSaveInterests}
          usn={profile.usn}
        />
      )}
    </div>
  );
};
