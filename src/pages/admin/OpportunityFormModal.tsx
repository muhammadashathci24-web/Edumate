import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Opportunity, OpportunityCategory } from '../../lib/types';
import { INTEREST_CATEGORIES, POPULAR_CITIES } from '../../lib/interestConstants';
import { Award } from 'lucide-react';

interface OpportunityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  onSave: (data: Partial<Opportunity>) => Promise<void>;
  departments: string[];
}

export const OpportunityFormModal: React.FC<OpportunityFormModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onSave,
  departments,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<OpportunityCategory>('Coding and technology');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [area, setArea] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [registrationLink, setRegistrationLink] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['ALL']);
  const [selectedYears, setSelectedYears] = useState<number[]>([1, 2, 3, 4]);
  const [scholarshipAward, setScholarshipAward] = useState('');
  const [scholarshipMinMarks, setScholarshipMinMarks] = useState<number | ''>('');
  const [scholarshipNotes, setScholarshipNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (opportunity) {
        setTitle(opportunity.title);
        setCategory(opportunity.category);
        setDescription(opportunity.description);
        setTagsInput((opportunity.subcategoryTags || []).join(', '));
        setVenue(opportunity.venue || '');
        setCity(opportunity.city || 'Bengaluru');
        setArea(opportunity.area || '');
        setEventDate(opportunity.eventDate ? opportunity.eventDate.split('T')[0] : '');
        setRegistrationDeadline(opportunity.registrationDeadline ? opportunity.registrationDeadline.split('T')[0] : '');
        setRegistrationLink(opportunity.registrationLink || '');
        setSelectedDepts(opportunity.eligibleDepartments || ['ALL']);
        setSelectedYears(opportunity.eligibleYears || [1, 2, 3, 4]);
        setScholarshipAward(opportunity.scholarshipDetails?.awardAmount || '');
        setScholarshipMinMarks(opportunity.scholarshipDetails?.minimumMarksPercentage ?? '');
        setScholarshipNotes(opportunity.scholarshipDetails?.criteriaNotes || '');
        setIsActive(opportunity.isActive);
      } else {
        setTitle('');
        setCategory('Coding and technology');
        setDescription('');
        setTagsInput('');
        setVenue('Campus Auditorium');
        setCity('Bengaluru');
        setArea('Main Campus');
        const defaultDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setEventDate(defaultDate);
        setRegistrationDeadline(defaultDate);
        setRegistrationLink('');
        setSelectedDepts(['ALL']);
        setSelectedYears([1, 2, 3, 4]);
        setScholarshipAward('');
        setScholarshipMinMarks('');
        setScholarshipNotes('');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, opportunity]);

  const handleToggleDept = (dept: string) => {
    if (dept === 'ALL') {
      setSelectedDepts(['ALL']);
      return;
    }
    setSelectedDepts((prev) => {
      const withoutAll = prev.filter((d) => d !== 'ALL');
      if (withoutAll.includes(dept)) {
        const next = withoutAll.filter((d) => d !== dept);
        return next.length === 0 ? ['ALL'] : next;
      } else {
        return [...withoutAll, dept];
      }
    });
  };

  const handleToggleYear = (yr: number) => {
    setSelectedYears((prev) =>
      prev.includes(yr) ? (prev.length > 1 ? prev.filter((y) => y !== yr) : prev) : [...prev, yr]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const parsedTags = Array.from(
        new Set(
          tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      );

      const interestTags = Array.from(
        new Set([category, ...parsedTags].filter(Boolean))
      );

      const payload: Partial<Opportunity> = {
        title: title.trim(),
        category,
        description: description.trim(),
        interestTags,
        subcategoryTags: parsedTags,
        venue: venue.trim() || 'Campus',
        city: city.trim() || 'Bengaluru',
        area: area.trim(),
        eventDate: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
        registrationDeadline: registrationDeadline
          ? new Date(registrationDeadline).toISOString()
          : new Date().toISOString(),
        registrationLink: registrationLink.trim(),
        eligibleDepartments: selectedDepts,
        eligibleYears: selectedYears,
        eligibleSections: ['ALL'],
        isActive,
      };

      if (category === 'Scholarships') {
        payload.scholarshipDetails = {
          awardAmount: scholarshipAward.trim(),
          minimumMarksPercentage: scholarshipMinMarks !== '' ? Number(scholarshipMinMarks) : undefined,
          criteriaNotes: scholarshipNotes.trim(),
        };
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save opportunity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={opportunity ? 'Edit Event / Opportunity' : 'Add New Event or Opportunity'}
    >
      <form onSubmit={handleSubmit} style={{ maxHeight: '78vh', overflowY: 'auto', padding: '0.25rem 0.5rem' }}>
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Title */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            Opportunity / Event Title <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. State Inter-Collegiate AI Hackathon 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Category & Status */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value as OpportunityCategory)}
            >
              {INTEREST_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
              <option value="Scholarships">Scholarships</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.75rem' }}>
            <input
              type="checkbox"
              id="isActiveCheckbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="isActiveCheckbox" style={{ fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              Active (Visible in student recommendations)
            </label>
          </div>
        </div>

        {/* Short Description */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            Description <span style={{ color: 'red' }}>*</span>
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Describe the opportunity, participation format, and key highlights..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Tags / Subcategories */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">
            Interest & Subcategory Tags <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>(Comma-separated)</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. AI and machine learning, hackathons, web development"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        {/* Venue, City, Area */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div className="form-group">
            <label className="form-label">Venue / Mode</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Campus Quadrangle or Online"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">City / Region</label>
            <select
              className="form-control"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {POPULAR_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Area / Campus Wing</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. South Campus, Hall 3"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
        </div>

        {/* Event Date & Registration Deadline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div className="form-group">
            <label className="form-label">Event Date</label>
            <input
              type="date"
              className="form-control"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Registration Deadline</label>
            <input
              type="date"
              className="form-control"
              value={registrationDeadline}
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Registration Link */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Registration / Information Link</label>
          <input
            type="url"
            className="form-control"
            placeholder="https://example.edu/register/event"
            value={registrationLink}
            onChange={(e) => setRegistrationLink(e.target.value)}
          />
        </div>

        {/* Academic Eligibility */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
            Academic Eligibility Scope
          </span>

          {/* Departments */}
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Eligible Departments:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => handleToggleDept('ALL')}
                className={`btn btn-sm ${selectedDepts.includes('ALL') ? 'btn-primary' : 'btn-outline'}`}
              >
                All Departments
              </button>
              {departments.map((dept) => {
                const isSelected = selectedDepts.includes(dept);
                return (
                  <button
                    type="button"
                    key={dept}
                    onClick={() => handleToggleDept(dept)}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Years */}
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Eligible Years:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[1, 2, 3, 4].map((yr) => (
                <button
                  type="button"
                  key={yr}
                  onClick={() => handleToggleYear(yr)}
                  className={`btn btn-sm ${selectedYears.includes(yr) ? 'btn-secondary' : 'btn-outline'}`}
                >
                  Year {yr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scholarship Fields (Conditional) */}
        {category === 'Scholarships' && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(217, 119, 6, 0.08)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Award size={18} style={{ color: '#d97706' }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Scholarship Conditions & Criteria</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Award Amount</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. ₹50,000"
                  value={scholarshipAward}
                  onChange={(e) => setScholarshipAward(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Min Marks % Required (Optional)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-control"
                  placeholder="e.g. 75"
                  value={scholarshipMinMarks}
                  onChange={(e) => setScholarshipMinMarks(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Eligibility Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. For enrolled 3rd-year engineering students"
                value={scholarshipNotes}
                onChange={(e) => setScholarshipNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          className="modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : opportunity ? 'Update Opportunity' : 'Create Opportunity'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
