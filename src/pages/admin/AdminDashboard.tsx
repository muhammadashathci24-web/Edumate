import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '../../components/Alert';
import { Student, Faculty, SectionsConfig, Course } from '../../lib/types';
import { AddStudentModal } from './AddStudentModal';
import { EditStudentModal } from './EditStudentModal';
import { AddFacultyModal } from './AddFacultyModal';
import { EditFacultyModal } from './EditFacultyModal';
import { ManageSectionsModal } from './ManageSectionsModal';
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
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'students' | 'faculty' | 'courses'>('courses');

  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [config, setConfig] = useState<SectionsConfig>({
    departments: ['AIML', 'CSE', 'IS', 'MECH', 'EC', 'Robotics'],
    years: [1, 2, 3, 4],
    sectionsByDeptYear: { 'AIML-3': ['A', 'B', 'C'] },
  });

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  // Filter States for Students
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Filter State for Faculty & Courses
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);

  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);

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
