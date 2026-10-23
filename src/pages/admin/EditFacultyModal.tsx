import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { SectionsConfig, Faculty, ClassSection } from '../../lib/types';
import { Save, Plus, Trash2 } from 'lucide-react';

interface EditFacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  faculty: Faculty | null;
  config: SectionsConfig;
  onFacultyUpdated: (faculty: Faculty) => void;
  adminToken: string | null;
}

export const EditFacultyModal: React.FC<EditFacultyModalProps> = ({
  isOpen,
  onClose,
  faculty,
  config,
  onFacultyUpdated,
  adminToken,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('AIML');
  const [assignedClasses, setAssignedClasses] = useState<ClassSection[]>([]);

  const [pickerDept, setPickerDept] = useState('AIML');
  const [pickerYear, setPickerYear] = useState<number>(3);
  const [pickerSec, setPickerSec] = useState('A');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (faculty) {
      setName(faculty.name);
      setEmail(faculty.email || '');
      setDepartment(faculty.department);
      setAssignedClasses(faculty.assignedClasses || []);
      setError(null);
    }
  }, [faculty]);

  if (!faculty) return null;

  const key = `${pickerDept}-${pickerYear}`;
  const availableSections = config.sectionsByDeptYear[key] || ['A'];

  const addClassSection = () => {
    const exists = assignedClasses.some(
      (c) => c.department === pickerDept && c.year === pickerYear && c.section === pickerSec
    );
    if (exists) {
      setError('Class section already exists in assigned list.');
      return;
    }
    setAssignedClasses([...assignedClasses, { department: pickerDept, year: pickerYear, section: pickerSec }]);
    setError(null);
  };

  const removeClassSection = (index: number) => {
    if (assignedClasses.length === 1) {
      setError('Faculty must have at least one assigned class section.');
      return;
    }
    setAssignedClasses(assignedClasses.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Name is required.');
    if (email && email.trim() && !email.includes('@')) return setError('Valid email is required.');
    if (assignedClasses.length === 0) return setError('At least one assigned class section is required.');

    setLoading(true);
    try {
      const res = await fetch(`/api/faculty/${encodeURIComponent(faculty.uid)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email ? email.trim().toLowerCase() : '',
          department,
          assignedClasses,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update faculty account.');
      }

      onFacultyUpdated(data.faculty);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Faculty: ${faculty.name}`}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {error && <Alert type="danger" message={error} onClose={() => setError(null)} />}

          <div className="form-group">
            <label className="form-label">Faculty Full Name <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">College Email (Optional)</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. faculty@college.edu (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <select
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

          <div style={{ marginTop: '1.25rem' }}>
            <label className="form-label">Assigned Class Sections</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: '0.5rem 0 0.85rem 0' }}>
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
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                    onClick={() => removeClassSection(idx)}
                    title="Remove assignment"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr)) auto',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.65rem',
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
                  setPickerSec(config.sectionsByDeptYear[newKey]?.[0] || 'A');
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
                  setPickerSec(config.sectionsByDeptYear[newKey]?.[0] || 'A');
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

              <button type="button" className="btn btn-secondary btn-sm" onClick={addClassSection}>
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
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
