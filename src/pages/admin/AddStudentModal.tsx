import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { SectionsConfig, Student } from '../../lib/types';
import { UserPlus, Shield } from 'lucide-react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SectionsConfig;
  onStudentAdded: (student: Student) => void;
  adminToken: string | null;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  config,
  onStudentAdded,
  adminToken,
}) => {
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(config.departments[0] || 'AIML');
  const [year, setYear] = useState<number>(3);
  const [section, setSection] = useState('A');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available sections for chosen department and year
  const key = `${department}-${year}`;
  const availableSections = config.sectionsByDeptYear[key] || ['A'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend pre-validation
    const normalizedUSN = usn.trim().toUpperCase();
    if (!name.trim()) return setError('Student full name is required.');
    if (!normalizedUSN) return setError('University Seat Number (USN) is required.');
    if (!email.trim() || !email.includes('@')) return setError('A valid college email address is required.');

    setLoading(true);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          usn: normalizedUSN,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          department,
          year,
          section: section || availableSections[0] || 'A',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create student account.');
      }

      onStudentAdded(data.student);
      onClose();
      // Reset fields
      setName('');
      setUsn('');
      setEmail('');
      setPhone('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enroll New Student">
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <Alert type="danger" message={error} onClose={() => setError(null)} />}

          <div
            style={{
              padding: '0.75rem 0.9rem',
              backgroundColor: 'var(--color-bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Shield size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span>
              The server will provision a Firebase Auth account securely and enforce database uniqueness on the normalized USN.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="add-stu-name">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="add-stu-name"
              type="text"
              className="form-input"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="add-stu-usn">
              University Seat Number (USN) <span className="required">*</span>
            </label>
            <input
              id="add-stu-usn"
              type="text"
              className="form-input"
              placeholder="e.g. 1EM22AI035"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
              required
            />
            <span className="form-helper">Normalized to uppercase and verified for uniqueness.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="add-stu-email">
              College Email Address <span className="required">*</span>
            </label>
            <input
              id="add-stu-email"
              type="email"
              className="form-input"
              placeholder="e.g. j.doe@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid-3" style={{ gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="add-stu-dept">
                Department <span className="required">*</span>
              </label>
              <select
                id="add-stu-dept"
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
              <label className="form-label" htmlFor="add-stu-year">
                Year <span className="required">*</span>
              </label>
              <select
                id="add-stu-year"
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
              <label className="form-label" htmlFor="add-stu-sec">
                Section <span className="required">*</span>
              </label>
              <select
                id="add-stu-sec"
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
            <label className="form-label" htmlFor="add-stu-phone">
              Contact Phone Number (Optional)
            </label>
            <input
              id="add-stu-phone"
              type="tel"
              className="form-input"
              placeholder="e.g. +91 98765 43210"
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
            <UserPlus size={16} />
            {loading ? 'Enrolling...' : 'Enroll Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
