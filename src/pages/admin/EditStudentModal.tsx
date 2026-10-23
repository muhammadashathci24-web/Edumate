import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { SectionsConfig, Student } from '../../lib/types';
import { Save } from 'lucide-react';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  config: SectionsConfig;
  onStudentUpdated: (student: Student) => void;
  adminToken: string | null;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  config,
  onStudentUpdated,
  adminToken,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('AIML');
  const [year, setYear] = useState<number>(3);
  const [section, setSection] = useState('A');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setName(student.name);
      setEmail(student.email);
      setPhone(student.phone || '');
      setDepartment(student.department);
      setYear(student.year);
      setSection(student.section);
      setError(null);
    }
  }, [student]);

  if (!student) return null;

  const key = `${department}-${year}`;
  const availableSections = config.sectionsByDeptYear[key] || ['A', 'B', 'C'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Name is required.');
    if (!email.trim() || !email.includes('@')) return setError('Valid email is required.');

    setLoading(true);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(student.usn)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          department,
          year,
          section,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update student.');
      }

      onStudentUpdated(data.student);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Student: ${student.name}`}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <Alert type="danger" message={error} onClose={() => setError(null)} />}

          <div className="form-group">
            <label className="form-label">University Seat Number (USN)</label>
            <input
              type="text"
              className="form-input"
              value={student.usn}
              disabled
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, background: '#f1f5f9' }}
            />
            <span className="form-helper">The USN is the unique college identifier and cannot be modified.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-stu-name">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="edit-stu-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-stu-email">
              College Email <span className="required">*</span>
            </label>
            <input
              id="edit-stu-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid-3" style={{ gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  const newKey = `${e.target.value}-${year}`;
                  const secs = config.sectionsByDeptYear[newKey] || ['A'];
                  setSection(secs[0] || 'A');
                }}
              >
                {config.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={year}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setYear(y);
                  const newKey = `${department}-${y}`;
                  const secs = config.sectionsByDeptYear[newKey] || ['A'];
                  setSection(secs[0] || 'A');
                }}
              >
                {config.years.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Section</label>
              <select
                className="form-select"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              >
                {availableSections.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-stu-phone">
              Contact Phone
            </label>
            <input
              id="edit-stu-phone"
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} />
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
