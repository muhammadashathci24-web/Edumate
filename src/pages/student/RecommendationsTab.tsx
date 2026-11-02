import React, { useState, useMemo } from 'react';
import { Opportunity, Student, StudentInterests, RecommendationMatch } from '../../lib/types';
import { matchOpportunities } from '../../lib/recommendations';
import {
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Award,
  Search,
  CheckCircle2,
  Compass,
  SlidersHorizontal,
} from 'lucide-react';

interface RecommendationsTabProps {
  student: Student;
  interests: StudentInterests | null;
  opportunities: Opportunity[];
  averageMarksPercentage?: number | null;
  onOpenInterestsModal: () => void;
}

export const RecommendationsTab: React.FC<RecommendationsTabProps> = ({
  student,
  interests,
  opportunities,
  averageMarksPercentage,
  onOpenInterestsModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate matches using the content-based recommendation engine
  const matches: RecommendationMatch[] = useMemo(() => {
    return matchOpportunities(student, interests, opportunities, averageMarksPercentage);
  }, [student, interests, opportunities, averageMarksPercentage]);

  // Filter by category and search query
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const opp = match.opportunity;
      if (selectedCategory !== 'ALL' && opp.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          opp.title.toLowerCase().includes(q) ||
          opp.description.toLowerCase().includes(q) ||
          opp.city.toLowerCase().includes(q) ||
          (opp.subcategoryTags || []).some((t) => t.toLowerCase().includes(q)) ||
          match.matchReasons.some((r) => r.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [matches, selectedCategory, searchQuery]);

  const hasInterests = Boolean(
    interests &&
      ((interests.categories && interests.categories.length > 0) ||
        (interests.subcategories && interests.subcategories.length > 0) ||
        (interests.customInterests && interests.customInterests.length > 0))
  );

  const categories = [
    { id: 'ALL', label: 'All Opportunities' },
    { id: 'Coding and technology', label: 'Coding & Tech' },
    { id: 'Sports', label: 'Sports' },
    { id: 'Cultural and arts activities', label: 'Cultural & Arts' },
    { id: 'Academic competitions and workshops', label: 'Academic & Workshops' },
    { id: 'Entrepreneurship and social impact', label: 'Social Impact' },
    { id: 'Scholarships', label: 'Scholarships' },
  ];

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Coding and technology':
        return 'badge-active';
      case 'Sports':
        return 'badge-faculty';
      case 'Cultural and arts activities':
        return 'badge-student';
      case 'Scholarships':
        return 'badge-admin';
      default:
        return 'badge';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Intro Header Card */}
      <div className="card">
        <div className="card-body" style={{ padding: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={22} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Personalized Opportunities & Event Recommendations
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', margin: 0 }}>
                Matched to your interests in {interests?.categories?.length ? interests.categories.join(', ') : 'campus activities'} &bull; Preferred area: <strong>{interests?.preferredCity || 'Bengaluru'}</strong>
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={onOpenInterestsModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <SlidersHorizontal size={15} />
              {hasInterests ? 'Refine My Interests' : 'Set My Interests'}
            </button>
          </div>

          {!hasInterests && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(79, 70, 229, 0.08)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '4px solid var(--color-primary)',
                fontSize: '0.85rem',
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                💡 <strong>Tip:</strong> Select your interests to get higher-accuracy recommendations for hackathons, sports, workshops, and scholarships.
              </span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={onOpenInterestsModal}
              >
                Choose Interests
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
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
              placeholder="Search recommended events, topics, or cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-card-bg)',
                  color: isSelected ? '#ffffff' : 'var(--color-text-main)',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommendations List */}
      {filteredMatches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <Compass size={36} style={{ color: 'var(--color-primary)', opacity: 0.6, margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            No matching opportunities found
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '460px', margin: '0 auto 1.25rem auto' }}>
            {searchQuery
              ? `No upcoming opportunities match "${searchQuery}". Try clearing your search filter.`
              : 'Try selecting additional interest topics or broadening your location preference to discover more events.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            {searchQuery && (
              <button type="button" className="btn btn-outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={onOpenInterestsModal}>
              Update My Interests
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredMatches.map(({ opportunity: opp, score, matchReasons, daysRemaining }) => {
            const isClosingSoon = daysRemaining >= 0 && daysRemaining <= 7;
            const eventFormattedDate = opp.eventDate
              ? new Date(opp.eventDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'TBD';
            const deadlineFormattedDate = opp.registrationDeadline
              ? new Date(opp.registrationDeadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Open';

            return (
              <div
                key={opp.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: score > 20 ? '3px solid var(--color-primary)' : '1px solid var(--color-border)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div className="card-body" style={{ padding: '1.25rem' }}>
                  {/* Category & Status Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span className={`badge ${getCategoryBadgeClass(opp.category)}`}>
                      {opp.category}
                    </span>

                    {daysRemaining >= 0 && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isClosingSoon ? '#fee2e2' : 'var(--color-bg-subtle)',
                          color: isClosingSoon ? '#991b1b' : 'var(--color-text-muted)',
                        }}
                      >
                        {daysRemaining === 0 ? 'Deadline Today!' : `${daysRemaining} days left to register`}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                    {opp.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.45', marginBottom: '0.85rem' }}>
                    {opp.description}
                  </p>

                  {/* Explainable "Why this matches" Box */}
                  <div
                    style={{
                      backgroundColor: 'rgba(79, 70, 229, 0.05)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.65rem 0.75rem',
                      marginBottom: '0.85rem',
                      borderLeft: '3px solid var(--color-primary)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '0.3rem',
                      }}
                    >
                      <Sparkles size={13} />
                      <span>Why this matches you</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {matchReasons.map((reason, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '0.775rem',
                            color: 'var(--color-text-main)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.35rem',
                          }}
                        >
                          <CheckCircle2 size={12} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  {opp.subcategoryTags && opp.subcategoryTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.85rem' }}>
                      {opp.subcategoryTags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            backgroundColor: 'var(--color-bg-subtle)',
                            color: 'var(--color-text-muted)',
                            fontWeight: 500,
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Event & Registration Metadata */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-muted)',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                      <span>Event Date: <strong>{eventFormattedDate}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={14} style={{ color: 'var(--color-secondary)' }} />
                      <span>Registration Deadline: <strong>{deadlineFormattedDate}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} style={{ color: 'var(--color-info)' }} />
                      <span>{opp.venue} &bull; {opp.city}</span>
                    </div>

                    {opp.category === 'Scholarships' && opp.scholarshipDetails?.awardAmount && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', fontWeight: 600 }}>
                        <Award size={14} />
                        <span>Award: {opp.scholarshipDetails.awardAmount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action */}
                <div
                  className="card-footer"
                  style={{
                    padding: '0.75rem 1.25rem',
                    backgroundColor: 'var(--color-bg-subtle)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {opp.registrationLink ? (
                    <a
                      href={opp.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span>Register / Apply</span>
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => alert(`Details for "${opp.title}":\n\nVenue: ${opp.venue}, ${opp.city}\nEvent Date: ${eventFormattedDate}\nDeadline: ${deadlineFormattedDate}\n\nContact college student affairs office for registration instructions.`)}
                    >
                      View Instructions
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
