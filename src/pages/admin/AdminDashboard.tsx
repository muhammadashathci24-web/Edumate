import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/Alert';
import { Student, Faculty, SectionsConfig, Course, Opportunity, AttendanceConfig } from '../../lib/types';
import { validateAttendanceRequirement, formatAttendancePercentage } from '../../lib/attendanceAnalysis';
import { AddStudentModal } from './AddStudentModal';
import { EditStudentModal } from './EditStudentModal';
import { AddFacultyModal } from './AddFacultyModal';
import { EditFacultyModal } from './EditFacultyModal';
import { ManageSectionsModal } from './ManageSectionsModal';
import { OpportunityFormModal } from './OpportunityFormModal';
import {
  Users,
  UserPlus,
  Search,
  Sliders,
  Power,
  Edit2,
  RefreshCw,
  GraduationCap,
  BookOpen,
  Sparkles,
  Plus,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'students' | 'faculty' | 'courses' | 'opportunities'>('courses');

  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [config, setConfig] = useState<SectionsConfig>({
    departments: ['AIML', 'CSE', 'IS', 'MECH', 'EC', 'Robotics'],
    years: [1, 2, 3, 4],
    sectionsByDeptYear: { 'AIML-3': ['A', 'B', 'C'] },
  });
  const [attendanceConfig, setAttendanceConfig] = useState<AttendanceConfig>({
    requiredAttendancePercentage: null,
  });
  const [attendanceReqInput, setAttendanceReqInput] = useState<string>('');
  const [savingAttendancePolicy, setSavingAttendancePolicy] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  // Filter States for Students
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Filter State for Faculty & Courses & Opportunities
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [opportunitySearchQuery, setOpportunitySearchQuery] = useState('');
  const [opportunityCategoryFilter, setOpportunityCategoryFilter] = useState('ALL');
  const [opportunityStatusFilter, setOpportunityStatusFilter] = useState('ALL');

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);

  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

  const [isAddOpportunityOpen, setIsAddOpportunityOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  // Fetch initial data
  const loadDirectoryData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Config
      const configRes = await fetch('/api/sections-config');
      if (configRes.ok) {
        setConfig(await configRes.json());
      }

      // Attendance Policy Config
      const attCfgRes = await fetch('/api/attendance-config');
      if (attCfgRes.ok) {
        const attCfg: AttendanceConfig = await attCfgRes.json();
        setAttendanceConfig(attCfg);
        setAttendanceReqInput(
          typeof attCfg.requiredAttendancePercentage === 'number'
            ? String(attCfg.requiredAttendancePercentage)
            : ''
        );
      }

      // Courses (8 active courses)
      const coursesRes = await fetch('/api/courses');
      if (coursesRes.ok) {
        setCourses(await coursesRes.json());
      }

      // Students
      const stuRes = await fetch('/api/students', { headers });
      if (stuRes.ok) {
        setStudents(await stuRes.json());
      }

      // Faculty
      const facRes = await fetch('/api/faculty', { headers });
      if (facRes.ok) {
        setFaculty(await facRes.json());
      }

      // Opportunities
      const oppRes = await fetch('/api/opportunities?all=true', { headers });
      if (oppRes.ok) {
        setOpportunities(await oppRes.json());
      }
    } catch (err: any) {
      setFeedback({ type: 'danger', message: 'Failed to load directories: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectoryData();
  }, [token]);

  // Toggle user status (Active <-> Disabled)
  const toggleUserStatus = async (uid: string, currentStatus: 'active' | 'disabled', name: string) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(uid)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update account status.');
      }

      // Update local student & faculty state
      setStudents((prev) =>
        prev.map((s) => (s.uid === uid ? { ...s, status: nextStatus } : s))
      );
      setFaculty((prev) =>
        prev.map((f) => (f.uid === uid ? { ...f, status: nextStatus } : f))
      );

      setFeedback({
        type: 'success',
        message: `Account for ${name} has been set to ${nextStatus}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  // Toggle opportunity active/inactive status
  const toggleOpportunityStatus = async (id: string, currentStatus: boolean, title: string) => {
    const nextStatus = !currentStatus;
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update opportunity status.');
      }

      // Sync directly with Firestore if client is active
      if (db && auth?.currentUser) {
        try {
          const oppDocRef = doc(db, 'opportunities', id);
          await updateDoc(oppDocRef, { isActive: nextStatus, updatedAt: new Date().toISOString() });
        } catch (fbErr) {
          console.warn('[Firestore] Admin sync status notice:', fbErr);
        }
      }

      // Broadcast change to open tabs
      try {
        const channel = new BroadcastChannel('edumate_opportunities');
        channel.postMessage({ type: 'OPPORTUNITIES_CHANGED', action: 'status', id, isActive: nextStatus });
        channel.close();
      } catch {
        // ignore
      }

      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, isActive: nextStatus } : o))
      );

      setFeedback({
        type: 'success',
        message: `"${title}" has been set to ${nextStatus ? 'Active' : 'Inactive'}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  // Save opportunity (Create or Update)
  const handleSaveOpportunity = async (data: Partial<Opportunity>) => {
    try {
      const isEdit = Boolean(editingOpportunity);
      const url = isEdit ? `/api/opportunities/${encodeURIComponent(editingOpportunity!.id)}` : '/api/opportunities';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save opportunity.');
      }

      const result = await res.json();
      const savedOpp = result.opportunity;

      // Sync directly with Firestore if client is active
      if (db && auth?.currentUser) {
        try {
          const oppDocRef = doc(db, 'opportunities', savedOpp.id);
          await setDoc(oppDocRef, savedOpp, { merge: true });
        } catch (fbErr) {
          console.warn('[Firestore] Admin direct save notice:', fbErr);
        }
      }

      // Broadcast change to open tabs
      try {
        const channel = new BroadcastChannel('edumate_opportunities');
        channel.postMessage({ type: 'OPPORTUNITIES_CHANGED', action: isEdit ? 'update' : 'create', id: savedOpp.id });
        channel.close();
      } catch {
        // ignore
      }

      if (isEdit) {
        setOpportunities((prev) => prev.map((o) => (o.id === savedOpp.id ? savedOpp : o)));
        setFeedback({ type: 'success', message: `Opportunity "${savedOpp.title}" updated successfully.` });
      } else {
        setOpportunities((prev) => [savedOpp, ...prev]);
        setFeedback({ type: 'success', message: `Opportunity "${savedOpp.title}" created successfully.` });
      }
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
      throw err;
    }
  };

  // Delete opportunity
  const handleDeleteOpportunity = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the opportunity "${title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete opportunity.');
      }

      // Sync directly with Firestore if client is active
      if (db && auth?.currentUser) {
        try {
          const oppDocRef = doc(db, 'opportunities', id);
          await deleteDoc(oppDocRef);
        } catch (fbErr) {
          console.warn('[Firestore] Admin direct delete notice:', fbErr);
        }
      }

      // Broadcast change to open tabs
      try {
        const channel = new BroadcastChannel('edumate_opportunities');
        channel.postMessage({ type: 'OPPORTUNITIES_CHANGED', action: 'delete', id });
        channel.close();
      } catch {
        // ignore
      }

      setOpportunities((prev) => prev.filter((o) => o.id !== id));
      setFeedback({ type: 'success', message: `Opportunity "${title}" was deleted successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  // Reseed directory data handler
  const handleReseed = async () => {
    if (!window.confirm('Reset directory data to default sample records?')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message });
        await loadDirectoryData();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Save institutional attendance requirement (Admin only)
  const handleSaveAttendancePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(attendanceReqInput);
    const validation = validateAttendanceRequirement(parsed);
    if (!validation.valid) {
      setFeedback({ type: 'danger', message: validation.error || 'Invalid attendance requirement.' });
      return;
    }

    setSavingAttendancePolicy(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/attendance-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requiredAttendancePercentage: parsed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save attendance requirement.');
      }

      setAttendanceConfig(data.config);

      // Sync directly with Firestore if client is active
      if (db && auth?.currentUser) {
        try {
          await setDoc(
            doc(db, 'sectionsConfig', 'default'),
            {
              requiredAttendancePercentage: data.config.requiredAttendancePercentage,
              attendanceRequirementUpdatedAt: data.config.updatedAt,
              attendanceRequirementUpdatedBy: data.config.updatedBy,
            },
            { merge: true }
          );
        } catch (fbErr) {
          console.warn('[Firestore] Attendance policy sync notice:', fbErr);
        }
      }

      try {
        const channel = new BroadcastChannel('edumate_attendance');
        channel.postMessage({ type: 'ATTENDANCE_CONFIG_CHANGED', config: data.config });
        channel.close();
      } catch {
        // ignore
      }

      setFeedback({
        type: 'success',
        message: `Official attendance requirement set to ${formatAttendancePercentage(parsed)}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setSavingAttendancePolicy(false);
    }
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.usn.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q);

    const matchDept = selectedDept === 'ALL' || s.department === selectedDept;
    const matchYear = selectedYear === 'ALL' || s.year === Number(selectedYear);
    const matchSec = selectedSection === 'ALL' || s.section === selectedSection;
    const matchStatus = selectedStatus === 'ALL' || s.status === selectedStatus;

    return matchQuery && matchDept && matchYear && matchSec && matchStatus;
  });

  // Filtered Faculty
  const filteredFaculty = faculty.filter((f) => {
    const q = facultySearchQuery.toLowerCase().trim();
    return (
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.email ? f.email.toLowerCase().includes(q) : false) ||
      f.department.toLowerCase().includes(q) ||
      (f.initials ? f.initials.toLowerCase().includes(q) : false) ||
      (f.courseCodes ? f.courseCodes.some((code) => code.toLowerCase().includes(q)) : false)
    );
  });

  // Filtered Courses
  const filteredCourses = courses.filter((c) => {
    const q = courseSearchQuery.toLowerCase().trim();
    return (
      !q ||
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.facultyNames ? c.facultyNames.some((fn) => fn.toLowerCase().includes(q)) : false)
    );
  });

  // Count third-year AIML students
  const aimlYear3Count = students.filter((s) => s.department === 'AIML' && s.year === 3).length;

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">Administrative Dashboard</h1>
            <p className="page-subtitle">
              Manage student enrollment, faculty class assignments, and institutional account credentials.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsManageSectionsOpen(true)}
              title="Configure available section letters per class"
            >
              <Sliders size={15} /> Section Settings
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReseed}
              disabled={loading}
              title="Re-initialize sample data"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> {loading ? 'Loading...' : 'Reset Directory'}
            </button>
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

      {/* Metrics Row */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-body" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Total Enrolled Students
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
                  {students.length}
                </div>
              </div>
              <div style={{ padding: '0.65rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary)' }}>
                <Users size={24} />
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              {aimlYear3Count} students in AIML Year 3 (Sections A, B, C)
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Active Course Catalog
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                  {courses.length} Courses
                </div>
              </div>
              <div style={{ padding: '0.65rem', background: '#eff6ff', borderRadius: 'var(--radius-sm)', color: 'var(--color-primary)' }}>
                <BookOpen size={24} />
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              8 AIML Year 3 courses (Sections A, B, C)
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  Faculty Directory
                </span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0369a1', marginTop: '0.2rem' }}>
                  {faculty.length} Faculty Members
                </div>
              </div>
              <div style={{ padding: '0.65rem', background: '#e0f2fe', borderRadius: 'var(--radius-sm)', color: '#0369a1' }}>
                <GraduationCap size={24} />
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Assigned teaching faculty
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Attendance Requirement Setting */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
          <form
            onSubmit={handleSaveAttendancePolicy}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>
                  Official Attendance Requirement Policy
                </span>
                {typeof attendanceConfig.requiredAttendancePercentage === 'number' ? (
                  <span className="badge badge-active">
                    Configured: {formatAttendancePercentage(attendanceConfig.requiredAttendancePercentage)}
                  </span>
                ) : (
                  <span className="badge badge-warning">Not Configured</span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Set the official minimum attendance percentage (&gt; 0% and &le; 100%) used for student attendance shortage warnings.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label htmlFor="admin-attendance-req" className="form-label" style={{ margin: 0 }}>
                Required %:
              </label>
              <input
                id="admin-attendance-req"
                type="number"
                min="0.1"
                max="100"
                step="0.5"
                className="form-input"
                style={{ width: '110px', padding: '0.4rem 0.6rem' }}
                placeholder="e.g. 75"
                value={attendanceReqInput}
                onChange={(e) => setAttendanceReqInput(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={savingAttendancePolicy}
              >
                {savingAttendancePolicy ? 'Saving...' : 'Save Requirement'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tabs */}
      <nav className="tabs-nav" aria-label="Admin directories">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <BookOpen size={16} /> Course Catalog ({courses.length})
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'faculty' ? 'active' : ''}`}
          onClick={() => setActiveTab('faculty')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <GraduationCap size={16} /> Faculty Directory ({faculty.length})
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={16} /> Students Directory ({students.length})
          </span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'opportunities' ? 'active' : ''}`}
          onClick={() => setActiveTab('opportunities')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} /> Opportunities & Events ({opportunities.length})
          </span>
        </button>
      </nav>

      {/* TAB 0: COURSE CATALOG */}
      {activeTab === 'courses' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">AIML Year 3 Course Catalog</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                Active curriculum courses for 3rd-year Artificial Intelligence &amp; Machine Learning students (Sections A, B, and C).
              </p>
            </div>
          </div>

          <div className="card-body">
            {/* Filter */}
            <div className="filter-bar">
              <div style={{ position: 'relative', flex: '1 1 260px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-subtle)',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem' }}
                  placeholder="Search by course code, title, or instructor..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)' }}>
                No courses found matching the search criteria.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Course Code</th>
                      <th>Course Title</th>
                      <th>Type / Credits</th>
                      <th>Eligible Class</th>
                      <th>Assigned Faculty Instructor(s)</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((c) => {
                      const isMultiFaculty = Boolean(c.facultyNames && c.facultyNames.length > 1);
                      return (
                        <tr key={c.code}>
                          <td>
                            <span className="usn-badge" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                              {c.code}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{c.title}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                              {c.type || 'Course'}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {c.credits ? `${c.credits} Credits` : 'Credits: Not provided'}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                backgroundColor: 'var(--color-bg-subtle)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              {c.department} &bull; Year {c.year} ({c.sections?.map((s) => `Sec ${s}`).join(', ')})
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              {c.facultyNames?.map((name, idx) => (
                                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{name}</span>
                                  {isMultiFaculty && (
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
                              {isMultiFaculty && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                  Joint course co-instructed by both faculty members
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="badge badge-active">Active</span>
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

      {/* TAB 1: STUDENTS DIRECTORY */}
      {activeTab === 'students' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Student Records</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                Search and filter enrolled students. Normalized USN enforces uniqueness in the database.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddStudentOpen(true)}
            >
              <UserPlus size={16} /> Enroll Student
            </button>
          </div>

          <div className="card-body">
            {/* Search and Filters */}
            <div className="filter-bar">
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-subtle)',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem' }}
                  placeholder="Search by name, USN, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Department filter */}
              <select
                className="form-select filter-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                aria-label="Filter by Department"
              >
                <option value="ALL">All Depts</option>
                {config.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Year filter */}
              <select
                className="form-select filter-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Filter by Year"
              >
                <option value="ALL">All Years</option>
                {config.years.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>

              {/* Section filter */}
              <select
                className="form-select filter-select"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                aria-label="Filter by Section"
              >
                <option value="ALL">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>

              {/* Status filter */}
              <select
                className="form-select filter-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter by Status"
              >
                <option value="ALL">All Statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)' }}>
                No student records found matching the current search criteria.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>USN</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Class</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((stu) => {
                      const isActive = stu.status === 'active';
                      return (
                        <tr key={stu.usn}>
                          <td>
                            <span className="usn-badge">{stu.usn}</span>
                          </td>
                          <td>
                            <strong>{stu.name}</strong>
                          </td>
                          <td>{stu.email}</td>
                          <td>
                            {stu.department} &bull; Y{stu.year}-{stu.section}
                          </td>
                          <td>{stu.phone || 'Not provided'}</td>
                          <td>
                            <span className={`badge ${isActive ? 'badge-active' : 'badge-disabled'}`}>
                              {isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingStudent(stu)}
                                title="Edit details"
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${isActive ? 'btn-danger-outline' : 'btn-secondary'}`}
                                onClick={() => toggleUserStatus(stu.uid, stu.status, stu.name)}
                                title={isActive ? 'Disable account access' : 'Enable account access'}
                              >
                                <Power size={13} /> {isActive ? 'Disable' : 'Enable'}
                              </button>
                            </div>
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

      {/* TAB 2: FACULTY DIRECTORY */}
      {activeTab === 'faculty' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Faculty Records</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                Manage teaching faculty, linked courses, and authorized class allocations.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddFacultyOpen(true)}
            >
              <UserPlus size={16} /> Add Faculty Account
            </button>
          </div>

          <div className="card-body">

            <div className="filter-bar">
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-subtle)',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem' }}
                  placeholder="Search faculty by name, initials, or course code..."
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredFaculty.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--color-text-muted)' }}>
                No faculty members found.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Faculty Member</th>
                      <th>Official Email</th>
                      <th>Department</th>
                      <th>Assigned Course(s)</th>
                      <th>Assigned Class Sections</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaculty.map((fac) => {
                      const isActive = fac.status === 'active';
                      return (
                        <tr key={fac.uid}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <strong>{fac.name}</strong>
                              {fac.initials && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                  ({fac.initials})
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {fac.email ? (
                              <span>{fac.email}</span>
                            ) : (
                              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                Not provided
                              </span>
                            )}
                          </td>
                          <td>{fac.department}</td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {fac.courseCodes?.map((code) => (
                                <span
                                  key={code}
                                  style={{
                                    backgroundColor: code === 'BAI505L' ? '#e0f2fe' : 'var(--color-bg-subtle)',
                                    color: code === 'BAI505L' ? '#0369a1' : 'inherit',
                                    border: code === 'BAI505L' ? '1px solid #bae6fd' : 'none',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                  }}
                                  title={code === 'BAI505L' ? 'Co-instructed: Dr. Vivek Kulkarni & Mrs. Asha Nair' : undefined}
                                >
                                  {code}
                                  {code === 'BAI505L' ? ' (Lab)' : ''}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {fac.assignedClasses?.map((cls, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    backgroundColor: 'var(--color-bg-subtle)',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  {cls.department} Y{cls.year}-{cls.section}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${isActive ? 'badge-active' : 'badge-disabled'}`}>
                              {isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingFaculty(fac)}
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${isActive ? 'btn-danger-outline' : 'btn-secondary'}`}
                                onClick={() => toggleUserStatus(fac.uid, fac.status, fac.name)}
                              >
                                <Power size={13} /> {isActive ? 'Disable' : 'Enable'}
                              </button>
                            </div>
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

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        config={config}
        adminToken={token}
        onStudentAdded={(newStu) => {
          setStudents((prev) => [newStu, ...prev]);
          setFeedback({
            type: 'success',
            message: `Student ${newStu.name} (${newStu.usn}) enrolled successfully.`,
          });
        }}
      />

      <EditStudentModal
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        config={config}
        adminToken={token}
        onStudentUpdated={(updatedStu) => {
          setStudents((prev) => prev.map((s) => (s.usn === updatedStu.usn ? updatedStu : s)));
          setFeedback({
            type: 'success',
            message: `Student record for ${updatedStu.name} updated successfully.`,
          });
        }}
      />

      <AddFacultyModal
        isOpen={isAddFacultyOpen}
        onClose={() => setIsAddFacultyOpen(false)}
        config={config}
        adminToken={token}
        onFacultyAdded={(newFac) => {
          setFaculty((prev) => [newFac, ...prev]);
          setFeedback({
            type: 'success',
            message: `Faculty account for ${newFac.name} created successfully.`,
          });
        }}
      />

      <EditFacultyModal
        isOpen={Boolean(editingFaculty)}
        onClose={() => setEditingFaculty(null)}
        faculty={editingFaculty}
        config={config}
        adminToken={token}
        onFacultyUpdated={(updatedFac) => {
          setFaculty((prev) => prev.map((f) => (f.uid === updatedFac.uid ? updatedFac : f)));
          setFeedback({
            type: 'success',
            message: `Faculty account for ${updatedFac.name} updated successfully.`,
          });
        }}
      />

      {/* TAB 4: OPPORTUNITIES CATALOG */}
      {activeTab === 'opportunities' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Opportunities & Events Catalog</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                Curate campus events, hackathons, sports meets, workshops, and scholarships for student recommendations.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingOpportunity(null);
                setIsAddOpportunityOpen(true);
              }}
            >
              <Plus size={15} /> Add New Opportunity
            </button>
          </div>

          <div className="card-body">
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search opportunities by title, description, or city..."
                  value={opportunitySearchQuery}
                  onChange={(e) => setOpportunitySearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>

              <div style={{ minWidth: '180px' }}>
                <select
                  className="form-control"
                  value={opportunityCategoryFilter}
                  onChange={(e) => setOpportunityCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="Coding and technology">Coding and technology</option>
                  <option value="Sports">Sports</option>
                  <option value="Cultural and arts activities">Cultural and arts activities</option>
                  <option value="Academic competitions and workshops">Academic competitions & workshops</option>
                  <option value="Entrepreneurship and social impact">Entrepreneurship & social impact</option>
                  <option value="Scholarships">Scholarships</option>
                </select>
              </div>

              <div style={{ minWidth: '140px' }}>
                <select
                  className="form-control"
                  value={opportunityStatusFilter}
                  onChange={(e) => setOpportunityStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>

            {/* Opportunities Table */}
            {opportunities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
                <p>No opportunities in the catalog. Click "Add New Opportunity" to create one.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title & Scope</th>
                      <th>Category</th>
                      <th>Venue & Region</th>
                      <th>Dates & Deadline</th>
                      <th>Eligibility</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities
                      .filter((opp) => {
                        if (opportunityCategoryFilter !== 'ALL' && opp.category !== opportunityCategoryFilter) {
                          return false;
                        }
                        if (opportunityStatusFilter === 'active' && !opp.isActive) return false;
                        if (opportunityStatusFilter === 'inactive' && opp.isActive) return false;
                        if (opportunitySearchQuery.trim()) {
                          const q = opportunitySearchQuery.toLowerCase().trim();
                          const matches =
                            opp.title.toLowerCase().includes(q) ||
                            opp.description.toLowerCase().includes(q) ||
                            opp.city.toLowerCase().includes(q) ||
                            (opp.subcategoryTags || []).some((t) => t.toLowerCase().includes(q));
                          if (!matches) return false;
                        }
                        return true;
                      })
                      .map((opp) => (
                        <tr key={opp.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{opp.title}</div>
                            <div style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {opp.description}
                            </div>
                            {opp.registrationLink && (
                              <a
                                href={opp.registrationLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}
                              >
                                <span>Link</span> <ExternalLink size={11} />
                              </a>
                            )}
                          </td>
                          <td>
                            <span className="badge">{opp.category}</span>
                            {opp.subcategoryTags && opp.subcategoryTags.length > 0 && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                {opp.subcategoryTags.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>{opp.venue}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{opp.city}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem' }}>
                              Event: {opp.eventDate ? opp.eventDate.split('T')[0] : 'TBD'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Deadline: {opp.registrationDeadline ? opp.registrationDeadline.split('T')[0] : 'None'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem' }}>
                              {opp.eligibleDepartments?.join(', ') || 'ALL'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Year {opp.eligibleYears?.join(', ') || '1-4'}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${opp.isActive ? 'badge-active' : 'badge-disabled'}`}>
                              {opp.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  setEditingOpportunity(opp);
                                  setIsAddOpportunityOpen(true);
                                }}
                                title="Edit Opportunity"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm ${opp.isActive ? 'btn-danger-outline' : 'btn-success-outline'}`}
                                onClick={() => toggleOpportunityStatus(opp.id, opp.isActive, opp.title)}
                                title={opp.isActive ? 'Deactivate Opportunity' : 'Activate Opportunity'}
                              >
                                <Power size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger-outline"
                                onClick={() => handleDeleteOpportunity(opp.id, opp.title)}
                                title="Delete Opportunity"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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

      {/* Opportunity Modal */}
      <OpportunityFormModal
        isOpen={isAddOpportunityOpen}
        onClose={() => {
          setIsAddOpportunityOpen(false);
          setEditingOpportunity(null);
        }}
        opportunity={editingOpportunity}
        onSave={handleSaveOpportunity}
        departments={config.departments}
      />

      <ManageSectionsModal
        isOpen={isManageSectionsOpen}
        onClose={() => setIsManageSectionsOpen(false)}
        config={config}
        adminToken={token}
        onConfigUpdated={(newConfig) => {
          setConfig(newConfig);
        }}
      />
    </div>
  );
};
