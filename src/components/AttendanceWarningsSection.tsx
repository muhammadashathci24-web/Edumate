import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Minus,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  analyzeAttendanceByCourseSection,
  formatAttendancePercentage,
  validateAttendanceRequirement,
  StudentAttendanceSession,
  CourseRef,
  CourseSectionAttendanceAnalysis,
} from '../lib/attendanceAnalysis';
import { AttendanceConfig } from '../lib/types';

interface AttendanceWarningsSectionProps {
  sessions: StudentAttendanceSession[];
  courses: CourseRef[];
  studentSection: {
    department: string;
    year: number;
    section: string;
  };
  attendanceConfig: AttendanceConfig;
}

export const AttendanceWarningsSection: React.FC<AttendanceWarningsSectionProps> = ({
  sessions,
  courses,
  studentSection,
  attendanceConfig,
}) => {
  const [previewInput, setPreviewInput] = useState<string>('');
  const [previewTarget, setPreviewTarget] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const officialRequired =
    typeof attendanceConfig.requiredAttendancePercentage === 'number' &&
    validateAttendanceRequirement(attendanceConfig.requiredAttendancePercentage).valid
      ? attendanceConfig.requiredAttendancePercentage
      : null;

  const activeRequirement = officialRequired !== null ? officialRequired : previewTarget;
  const isOfficialRule = officialRequired !== null;

  const analyses: CourseSectionAttendanceAnalysis[] = useMemo(() => {
    return analyzeAttendanceByCourseSection(
      sessions,
      courses,
      studentSection,
      activeRequirement
    );
  }, [sessions, courses, studentSection, activeRequirement]);

  const handleApplyPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewInput.trim()) {
      setPreviewTarget(null);
      setPreviewError(null);
      return;
    }
    const parsed = Number(previewInput);
    const validation = validateAttendanceRequirement(parsed);
    if (!validation.valid) {
      setPreviewError(validation.error || 'Enter a percentage greater than 0 and up to 100.');
      return;
    }
    setPreviewError(null);
    setPreviewTarget(parsed);
  };

  const renderStatusBadge = (item: CourseSectionAttendanceAnalysis) => {
    if (!item.threshold) {
      return <span className="badge badge-warning">Rule Not Configured</span>;
    }
    switch (item.threshold.status) {
      case 'insufficient_data':
        return <span className="badge">No Data Yet</span>;
      case 'below_threshold':
        return <span className="badge badge-disabled">Below Requirement</span>;
      case 'at_limit':
        return <span className="badge badge-warning">0 Absences Left</span>;
      case 'safe':
        return <span className="badge badge-active">On Track</span>;
    }
  };

  const renderTrendIcon = (direction: 'up' | 'down' | 'stable' | null) => {
    if (direction === 'down') {
      return <TrendingDown size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />;
    }
    if (direction === 'up') {
      return <TrendingUp size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />;
    }
    return <Minus size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />;
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
          <div>
            <h2 className="card-title">Attendance Shortage Warnings &amp; Trend Estimates</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
              Calculated independently for each course and section from your recorded attendance sessions.
            </p>
          </div>
        </div>

        {isOfficialRule ? (
          <span className="badge badge-active" style={{ fontSize: '0.78rem' }}>
            Official Requirement: {formatAttendancePercentage(officialRequired!)}
          </span>
        ) : (
          <span className="badge badge-warning" style={{ fontSize: '0.78rem' }}>
            Official Requirement Not Configured
          </span>
        )}
      </div>

      <div className="card-body">
        {!isOfficialRule && (
          <div
            style={{
              padding: '0.9rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: 'var(--color-warning)' }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  Official attendance requirement has not been configured by the College Administration yet.
                </div>
                <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--color-text-main)' }}>
                  Your actual attendance counts and weekly regression trend are shown below without assuming an unconfirmed college rule.
                  Optionally, you may enter a personal preview target (%) to test how many absences would be safe under that target.
                </p>

                <form
                  onSubmit={handleApplyPreview}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.65rem' }}
                >
                  <label htmlFor="student-preview-target" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    Personal preview target (%):
                  </label>
                  <input
                    id="student-preview-target"
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.5"
                    className="form-input"
                    style={{ width: '110px', padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                    placeholder="e.g. 75"
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm">
                    Preview
                  </button>
                  {previewTarget !== null && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)' }}
                      onClick={() => {
                        setPreviewInput('');
                        setPreviewTarget(null);
                        setPreviewError(null);
                      }}
                    >
                      Clear preview
                    </button>
                  )}
                </form>
                {previewError && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-danger)', marginTop: '0.35rem', fontWeight: 600 }}>
                    {previewError}
                  </p>
                )}
                {previewTarget !== null && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '0.35rem', fontWeight: 600 }}>
                    Showing personal preview against {formatAttendancePercentage(previewTarget)} (not an official college rule).
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {analyses.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No courses or attendance sessions found for your section yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {analyses.map((item) => {
              const currPctLabel =
                item.currentPercentage !== null
                  ? formatAttendancePercentage(item.currentPercentage)
                  : 'N/A';

              return (
                <div
                  key={item.key}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.15rem',
                    backgroundColor: 'var(--color-bg-surface)',
                  }}
                >
                  {/* Course & Section Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                        {item.displayName}
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {item.department} &bull; Year {item.year} &bull; Section {item.section}
                      </span>
                    </div>
                    {renderStatusBadge(item)}
                  </div>

                  {/* Separate metrics grid: Current Attendance, Required %, Remaining Safe Absences */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      gap: '0.75rem',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Current Attendance
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.15rem' }}>
                        {item.held > 0 ? `${currPctLabel} (${item.attended}/${item.held})` : '0 / 0 classes'}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Required Percentage
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.15rem' }}>
                        {activeRequirement !== null ? (
                          <>
                            {formatAttendancePercentage(activeRequirement)}{' '}
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                              {isOfficialRule ? '(Official)' : '(Preview)'}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-warning)' }}>
                            Not configured
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Remaining Safe Absences
                      </div>
                      <div
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          marginTop: '0.15rem',
                          color:
                            item.threshold?.status === 'below_threshold'
                              ? 'var(--color-danger)'
                              : item.threshold?.status === 'at_limit'
                              ? 'var(--color-warning)'
                              : 'var(--color-text-main)',
                        }}
                      >
                        {item.threshold
                          ? item.threshold.safeAbsences !== null
                            ? `${item.threshold.safeAbsences} ${item.threshold.safeAbsences === 1 ? 'class' : 'classes'}`
                            : 'Insufficient data'
                          : 'Pending policy'}
                      </div>
                    </div>
                  </div>

                  {/* Plain-language threshold explanation */}
                  <div
                    style={{
                      padding: '0.7rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor:
                        item.threshold?.status === 'below_threshold'
                          ? 'var(--color-danger-bg)'
                          : item.threshold?.status === 'at_limit'
                          ? 'var(--color-warning-bg)'
                          : item.threshold?.status === 'safe'
                          ? 'var(--color-success-bg)'
                          : 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-main)',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                    }}
                  >
                    {item.threshold?.status === 'safe' ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }} />
                    ) : item.threshold?.status === 'below_threshold' || item.threshold?.status === 'at_limit' ? (
                      <AlertTriangle
                        size={16}
                        style={{
                          color: item.threshold.status === 'below_threshold' ? 'var(--color-danger)' : 'var(--color-warning)',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      />
                    ) : (
                      <Info size={16} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div>
                      {item.threshold ? (
                        <span>{item.threshold.explanation}</span>
                      ) : item.held === 0 ? (
                        <span>Not enough attendance data yet (0 of 0 classes held).</span>
                      ) : (
                        <span>
                          Attendance: {item.attended} of {item.held} classes ({currPctLabel}). Official required percentage is not configured yet.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Separate Regression Trend Estimate Box */}
                  <div
                    style={{
                      padding: '0.7rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-info-bg)',
                      border: '1px solid var(--color-info-border)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: 'var(--color-info)' }}>
                      {renderTrendIcon(item.regression.trendDirection)}
                      <span>Weekly Trend Forecast (Estimate Only): {item.regression.summary}</span>
                    </div>

                    {item.regression.hasEnoughHistory ? (
                      <div style={{ marginTop: '0.3rem', color: 'var(--color-text-main)', fontSize: '0.78rem' }}>
                        Weekly attendance ({item.regression.weeksCount} weeks):{' '}
                        {item.regression.weeklyPoints
                          .map((pt) => `W${pt.weekNumber} (${pt.weekStart}): ${formatAttendancePercentage(pt.percentage)}`)
                          .join(' | ')}
                      </div>
                    ) : (
                      <div style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                        Recorded weeks for this course-section: {item.regression.weeksCount} of 3 required.
                      </div>
                    )}

                    <div style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      {item.regression.disclaimer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
