import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Alert } from '../../components/Alert';
import { SectionsConfig } from '../../lib/types';
import { Save, Plus, Trash2 } from 'lucide-react';

interface ManageSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SectionsConfig;
  onConfigUpdated: (newConfig: SectionsConfig) => void;
  adminToken: string | null;
}

export const ManageSectionsModal: React.FC<ManageSectionsModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
  adminToken,
}) => {
  const [selectedDept, setSelectedDept] = useState(config.departments[0] || 'AIML');
  const [selectedYear, setSelectedYear] = useState<number>(3);
  const [newSectionLetter, setNewSectionLetter] = useState('');
  const [sectionsMap, setSectionsMap] = useState<Record<string, string[]>>({
    ...config.sectionsByDeptYear,
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'danger' | 'success'; message: string } | null>(null);

  const currentKey = `${selectedDept}-${selectedYear}`;
  const currentSections = sectionsMap[currentKey] || ['A'];

  const handleAddSection = () => {
    const letter = newSectionLetter.trim().toUpperCase();
    if (!letter) {
      setFeedback({ type: 'danger', message: 'Enter a valid section name or letter (e.g. D).' });
      return;
    }
    if (currentSections.includes(letter)) {
      setFeedback({ type: 'danger', message: `Section ${letter} already exists for ${selectedDept} Year ${selectedYear}.` });
      return;
    }

    const updatedList = [...currentSections, letter].sort();
    setSectionsMap({
      ...sectionsMap,
      [currentKey]: updatedList,
    });
    setNewSectionLetter('');
    setFeedback(null);
  };

  const handleRemoveSection = (sec: string) => {
    if (currentSections.length <= 1) {
      setFeedback({ type: 'danger', message: 'Each class must have at least one section configured.' });
      return;
    }
    const updatedList = currentSections.filter((s) => s !== sec);
    setSectionsMap({
      ...sectionsMap,
      [currentKey]: updatedList,
    });
    setFeedback(null);
  };

  const handleSave = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/sections-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ sectionsByDeptYear: sectionsMap }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update sections configuration.');
      }

      onConfigUpdated(data.config);
      setFeedback({ type: 'success', message: 'Sections configuration updated successfully!' });
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Class Sections">
      <div className="modal-body">
        {feedback && (
          <Alert
            type={feedback.type}
            message={feedback.message}
            onClose={() => setFeedback(null)}
          />
        )}

        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
          Select a department and year to configure which class sections are active and available when enrolling students or assigning faculty.
        </p>

        <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              {config.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Year</label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {config.years.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            Configured Sections for {selectedDept} Year {selectedYear}:
          </span>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
            {currentSections.map((sec) => (
              <div
                key={sec}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.65rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                <span>Section {sec}</span>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0 2px' }}
                  onClick={() => handleRemoveSection(sec)}
                  title={`Remove section ${sec}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add section field */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <input
              type="text"
              className="form-input"
              style={{ maxWidth: '140px', textTransform: 'uppercase' }}
              placeholder="e.g. D"
              maxLength={4}
              value={newSectionLetter}
              onChange={(e) => setNewSectionLetter(e.target.value.toUpperCase())}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddSection}>
              <Plus size={14} /> Add Section
            </button>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={loading}>
          <Save size={16} />
          {loading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </Modal>
  );
};
