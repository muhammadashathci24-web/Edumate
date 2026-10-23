import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { SectionsConfig, Faculty, ClassSection } from '../../lib/types';
import { UserPlus, Plus, Trash2 } from 'lucide-react';

interface AddFacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SectionsConfig;
  onFacultyAdded: (faculty: Faculty) => void;
  adminToken: string | null;
}

export const AddFacultyModal: React.FC<AddFacultyModalProps> = ({
  isOpen,
  onClose,
  config,
  onFacultyAdded,
  adminToken,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState(config.departments[0] || 'AIML');

  // Assigned classes list
  const [assignedClasses, setAssignedClasses] = useState<ClassSection[]>([
    { department: 'AIML', year: 3, section: 'A' },
  ]);

  // Temp class picker state for adding another class
  const [pickerDept, setPickerDept] = useState(config.departments[0] || 'AIML');
  const [pickerYear, setPickerYear] = useState<number>(3);
  const [pickerSec, setPickerSec] = useState('A');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = `${pickerDept}-${pickerYear}`;
  const availableSections = config.sectionsByDeptYear[key] || ['A'];

  const addClassSection = () => {
    // Check for duplicate
    const exists = assignedClasses.some(
      (c) => c.department === pickerDept && c.year === pickerYear && c.section === pickerSec
    );
    if (exists) {
      setError('This class section is already added to the assignment list.');
      return;
    }
    setAssignedClasses([...assignedClasses, { department: pickerDept, year: pickerYear, section: pickerSec }]);
    setError(null);
  };

  const removeClassSection = (index: number) => {
    if (assignedClasses.length === 1) {
      setError('Faculty must be assigned at least one class section.');
      return;
    }
    setAssignedClasses(assignedClasses.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Faculty name is required.');
    if (!email.trim() || !email.includes('@')) return setError('Valid college email is required.');
    if (assignedClasses.length === 0) return setError('At least one class section must be assigned.');

    setLoading(true);
    try {
      const res = await fetch('/api/faculty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department,
          assignedClasses,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create faculty account.');
      }

      onFacultyAdded(data.faculty);
      onClose();
      setName('');
      setEmail('');
      setAssignedClasses([{ department: 'AIML', year: 3, section: 'A' }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Faculty Account">
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <Alert type="danger" message={error} onClose={() => setError(null)} />}

          <div className="form-group">
            <label className="form-label" htmlFor="add-fac-name">
              Faculty Member Name <span className="required">*</span>
            </label>
            <input
              id="add-fac-name"
              type="text"
              className="form-input"
              placeholder="e.g. Dr. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="add-fac-email">
              College Email <span className="required">*</span>
            </label>
            <input
              id="add-fac-email"
              type="email"
              className="form-input"
              placeholder="e.g. j.smith@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="add-fac-dept">
              Primary Department <span className="required">*</span>
            </label>
            <select
              id="add-fac-dept"
              className="form-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {config.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Classes Section */}
          <div style={{ marginTop: '1.25rem' }}>
            <label className="form-label">
              Assigned Class Sections <span className="required">*</span>
            </label>
            <p className="form-helper" style={{ marginBottom: '0.5rem' }}>
              Faculty will only have access to records for these specific sections.
            </p>

            {/* List of currently assigned classes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
              {assignedClasses.map((cls, idx) => (
                <div
                  key={`${cls.department}-${cls.year}-${cls.section}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--color-bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {cls.department} &bull; Year {cls.year} (Section {cls.section})
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', padding: '2px 4px' }}
                    onClick={() => removeClassSection(idx)}
                    title="Remove assignment"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Selector to add another class */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr)) auto',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.75rem',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                value={pickerDept}
                onChange={(e) => {
                  setPickerDept(e.target.value);
                  const newKey = `${e.target.value}-${pickerYear}`;
                  const secs = config.sectionsByDeptYear[newKey] || ['A'];
                  setPickerSec(secs[0] || 'A');
                }}
              >
                {config.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                value={pickerYear}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setPickerYear(y);
                  const newKey = `${pickerDept}-${y}`;
                  const secs = config.sectionsByDeptYear[newKey] || ['A'];
                  setPickerSec(secs[0] || 'A');
                }}
              >
                {config.years.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                value={pickerSec}
                onChange={(e) => setPickerSec(e.target.value)}
              >
                {availableSections.map((s) => (
                  <option key={s} value={s}>
                    Sec {s}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addClassSection}
              >
                <Plus size={14} /> Add Class
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <UserPlus size={16} />
            {loading ? 'Creating Account...' : 'Create Faculty Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
