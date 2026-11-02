import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { StudentInterests } from '../lib/types';
import { INTEREST_CATEGORIES, POPULAR_CITIES } from '../lib/interestConstants';
import {
  Sparkles,
  MapPin,
  Plus,
  X,
  Check,
  Trophy,
  Code2,
  Palette,
  BookOpen,
  Rocket,
  Compass,
  Navigation,
} from 'lucide-react';

interface InterestsQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInterests?: StudentInterests | null;
  onSave: (interests: StudentInterests) => Promise<void>;
  usn: string;
}

export const InterestsQuestionnaireModal: React.FC<InterestsQuestionnaireModalProps> = ({
  isOpen,
  onClose,
  currentInterests,
  onSave,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState<string>('');
  const [preferredCity, setPreferredCity] = useState<string>('Bengaluru');
  const [customCityInput, setCustomCityInput] = useState<string>('');
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or currentInterests changes
  useEffect(() => {
    if (isOpen) {
      if (currentInterests) {
        setSelectedCategories(currentInterests.categories || []);
        setSelectedSubcategories(currentInterests.subcategories || []);
        setCustomInterests(currentInterests.customInterests || []);
        const city = currentInterests.preferredCity || 'Bengaluru';
        if (POPULAR_CITIES.includes(city)) {
          setPreferredCity(city);
          setCustomCityInput('');
        } else {
          setPreferredCity('Custom');
          setCustomCityInput(city);
        }
      } else {
        setSelectedCategories([]);
        setSelectedSubcategories([]);
        setCustomInterests([]);
        setPreferredCity('Bengaluru');
        setCustomCityInput('');
      }
      setLocationNote(null);
      setError(null);
    }
  }, [isOpen, currentInterests]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const exists = prev.includes(categoryId);
      if (exists) {
        // Also remove any subcategories belonging to this category
        const catConfig = INTEREST_CATEGORIES.find((c) => c.id === categoryId);
        if (catConfig) {
          setSelectedSubcategories((subPrev) =>
            subPrev.filter((s) => !catConfig.subcategories.includes(s))
          );
        }
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const toggleSubcategory = (sub: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleAddCustomInterest = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!customInterests.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setCustomInterests((prev) => [...prev, trimmed]);
    }
    setCustomInput('');
  };

  const handleRemoveCustomInterest = (itemToRemove: string) => {
    setCustomInterests((prev) => prev.filter((item) => item !== itemToRemove));
  };

  // Optional browser location permission
  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationNote('Browser geolocation is not supported on this device.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationNote(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetectingLocation(false);
        const { latitude, longitude } = position.coords;
        // Bengaluru approx coordinates: ~12.97, ~77.59
        // Rough nearest major Karnataka college city detection or helpful tag
        if (latitude >= 12.5 && latitude <= 13.5 && longitude >= 77.0 && longitude <= 78.0) {
          setPreferredCity('Bengaluru');
          setLocationNote('Detected nearby city: Bengaluru.');
        } else if (latitude >= 12.0 && latitude <= 12.6 && longitude >= 76.3 && longitude <= 77.0) {
          setPreferredCity('Mysuru');
          setLocationNote('Detected nearby city: Mysuru.');
        } else if (latitude >= 12.6 && latitude <= 13.2 && longitude >= 74.6 && longitude <= 75.3) {
          setPreferredCity('Mangaluru');
          setLocationNote('Detected nearby city: Mangaluru.');
        } else {
          setPreferredCity('Bengaluru');
          setLocationNote(`Coordinates resolved (${latitude.toFixed(2)}, ${longitude.toFixed(2)}). Set default to Bengaluru.`);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationNote('Location permission was declined. You can select your city manually above.');
        } else {
          setLocationNote('Could not detect location. Please select your city manually.');
        }
      },
      { timeout: 8000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const finalCity = preferredCity === 'Custom' ? (customCityInput.trim() || 'Bengaluru') : preferredCity;
      const payload: StudentInterests = {
        categories: selectedCategories,
        subcategories: selectedSubcategories,
        customInterests,
        preferredCity: finalCity,
        updatedAt: new Date().toISOString(),
      };
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save interests.');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'Sports':
        return <Trophy size={18} />;
      case 'Coding and technology':
        return <Code2 size={18} />;
      case 'Cultural and arts activities':
        return <Palette size={18} />;
      case 'Academic competitions and workshops':
        return <BookOpen size={18} />;
      case 'Entrepreneurship and social impact':
        return <Rocket size={18} />;
      default:
        return <Compass size={18} />;
    }
  };

  // Get active subcategories based on currently selected categories
  const activeSubcategoryGroups = INTEREST_CATEGORIES.filter((cat) =>
    selectedCategories.includes(cat.id)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Personalize Opportunities & Event Recommendations"
    >
      <div style={{ maxHeight: '75vh', overflowY: 'auto', padding: '0.25rem 0.5rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
          Select your interest areas to receive personalized recommendations for upcoming workshops,
          hackathons, sports meets, cultural fests, academic competitions, and scholarships.
        </p>

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

        {/* STEP 1: Main Category Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
            <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>1. What are you interested in?</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>(Multi-select)</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {INTEREST_CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.06)' : 'var(--color-card-bg)',
                    color: 'var(--color-text-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryIcon(cat.id)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{cat.label}</span>
                      {isSelected && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                      {cat.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: Subcategories (Dynamic based on selected categories) */}
        {selectedCategories.length > 0 && (
          <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--color-bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <Compass size={16} style={{ color: 'var(--color-secondary)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                2. Select specific topics & subcategories
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeSubcategoryGroups.map((catGroup) => (
                <div key={catGroup.id}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {catGroup.label} Subcategories:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {catGroup.subcategories.map((sub) => {
                      const isSubSelected = selectedSubcategories.includes(sub);
                      return (
                        <button
                          type="button"
                          key={sub}
                          onClick={() => toggleSubcategory(sub)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '9999px',
                            border: `1px solid ${isSubSelected ? 'var(--color-secondary)' : 'var(--color-border)'}`,
                            backgroundColor: isSubSelected ? 'var(--color-secondary)' : 'var(--color-card-bg)',
                            color: isSubSelected ? '#ffffff' : 'var(--color-text-main)',
                            fontSize: '0.825rem',
                            fontWeight: isSubSelected ? 600 : 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSubSelected && <Check size={13} />}
                          <span>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Custom interest tag input when 'Other' or subcategory 'other' is selected */}
              {(selectedCategories.includes('Other') || selectedSubcategories.includes('other')) && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    Add specific custom interest:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '420px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Drone Racing, Space Tech, Chess"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomInterest();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddCustomInterest}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                    >
                      <Plus size={15} /> Add
                    </button>
                  </div>

                  {customInterests.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {customInterests.map((item) => (
                        <span
                          key={item}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.6rem',
                            backgroundColor: 'rgba(79, 70, 229, 0.12)',
                            color: 'var(--color-primary)',
                            borderRadius: '9999px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomInterest(item)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: 'inherit',
                              cursor: 'pointer',
                              display: 'flex',
                              padding: 0,
                            }}
                            aria-label={`Remove ${item}`}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Location Preference (Optional) */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <MapPin size={16} style={{ color: 'var(--color-info)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              3. Preferred City or Area (Optional)
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
            Used to prioritize in-person competitions and events happening near you.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ minWidth: '200px' }}>
              <select
                className="form-control"
                value={preferredCity}
                onChange={(e) => setPreferredCity(e.target.value)}
              >
                {POPULAR_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
                <option value="Custom">Other city/area...</option>
              </select>
            </div>

            {preferredCity === 'Custom' && (
              <div style={{ flex: 1, minWidth: '180px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your city or campus area"
                  value={customCityInput}
                  onChange={(e) => setCustomCityInput(e.target.value)}
                />
              </div>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.825rem',
              }}
            >
              <Navigation size={14} />
              {isDetectingLocation ? 'Detecting...' : 'Optional: Detect Nearest City'}
            </button>
          </div>

          {locationNote && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-info)', marginTop: '0.4rem' }}>
              {locationNote}
            </div>
          )}
        </div>
      </div>

      {/* Modal Actions */}
      <div
        className="modal-footer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <button
          type="button"
          className="btn btn-outline"
          onClick={onClose}
          disabled={saving}
        >
          Skip for Now
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {saving ? 'Saving...' : 'Save Interests'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
