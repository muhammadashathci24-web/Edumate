import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  analyzeMarksByCourseSection,
  CourseSectionMarksAnalysis,
  formatMarksValue,
  INTERNAL_MAX_MARKS,
  REQUIRED_INTERNAL_AVERAGE,
  StudentMarkEntry,
} from '../lib/marksAnalysis';
import { CourseRef } from '../lib/attendanceAnalysis';

interface MarksWarningsSectionProps {
  marks: StudentMarkEntry[];
  courses: CourseRef[];
  studentSection: {
    department: string;
    year: number;
    section: string;
  };
}

export const MarksWarningsSection: React.FC<MarksWarningsSectionProps> = ({
  marks,
  courses,
  studentSection,
}) => {
  const analyses: CourseSectionMarksAnalysis[] = useMemo(() => {
    return analyzeMarksByCourseSection(marks, courses, studentSection);
  }, [marks, courses, studentSection]);

  const renderBadge = (item: CourseSectionMarksAnalysis) => {
    switch (item.status) {
      case 'final_meets_target':
        return <span className="badge badge-active">{item.statusLabel}</span>;
      case 'final_below_target':
      case 'impossible_to_reach':
        return <span className="badge badge-disabled">{item.statusLabel}</span>;
      case 'projected_below_target':
      case 'currently_below_target':
        return <span className="badge badge-warning">{item.statusLabel}</span>;
      case 'projected_meets_target':
      case 'on_track':
        return <span className="badge badge-active">{item.statusLabel}</span>;
      case 'no_data':
        return <span className="badge">{item.statusLabel}</span>;
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} style={{ color: '#d97706' }} />
          <div>
            <h2 className="card-title">Internal Marks Warnings &amp; Projections</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
              3 internal assessments per course (max {INTERNAL_MAX_MARKS} marks each). Minimum required average: {REQUIRED_INTERNAL_AVERAGE}/{INTERNAL_MAX_MARKS} (36 total marks).
            </p>
          </div>
        </div>
        <span className="badge badge-active" style={{ fontSize: '0.78rem' }}>
          Target: {REQUIRED_INTERNAL_AVERAGE}/{INTERNAL_MAX_MARKS} Average
        </span>
      </div>

      <div className="card-body">
        {analyses.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            No courses or internal mark records found for your section yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {analyses.map((item) => {
              const recordedMap = new Map(
                item.recordedInternals.map((r) => [r.internalNumber, r.score])
              );
              const avgValue = item.isFinal ? item.actualFinalAverage : item.currentAverage;

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
                    {renderBadge(item)}
                  </div>

                  {/* Internals breakdown & metrics */}
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
                        Internal Scores (3 Assessments)
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '0.2rem' }}>
                        {([1, 2, 3] as const)
                          .map((num) => {
                            const s = recordedMap.get(num);
                            return `IA${num}: ${s !== undefined ? `${formatMarksValue(s)}/30` : 'Pending'}`;
                          })
                          .join(' | ')}
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
                        {item.isFinal ? 'Final Average (Actual)' : 'Current Average (Incomplete)'}
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '0.15rem' }}>
                        {avgValue !== null ? `${formatMarksValue(avgValue)} / 30` : 'No scores yet'}
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
                        {item.isFinal ? 'Final Eligibility' : 'Required Avg in Remaining'}
                      </div>
                      <div
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          marginTop: '0.15rem',
                          color:
                            item.status === 'final_below_target' || item.cannotReachTarget
                              ? 'var(--color-danger)'
                              : item.status === 'currently_below_target' || item.status === 'projected_below_target'
                              ? 'var(--color-warning)'
                              : 'var(--color-text-main)',
                        }}
                      >
                        {item.isFinal
                          ? item.status === 'final_meets_target'
                            ? 'Meets 12/30'
                            : 'Below 12/30'
                          : item.cannotReachTarget
                          ? `${formatMarksValue(item.rawRequiredRemainingAverage!)}/30 (> 30 max)`
                          : `${formatMarksValue(item.requiredRemainingAverage!)} / 30`}
                      </div>
                    </div>
                  </div>

                  {/* Plain-language calculation box */}
                  <div
                    style={{
                      padding: '0.7rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor:
                        item.status === 'final_below_target' || item.cannotReachTarget
                          ? 'var(--color-danger-bg)'
                          : item.status === 'currently_below_target' || item.status === 'projected_below_target'
                          ? 'var(--color-warning-bg)'
                          : item.status === 'final_meets_target' || item.status === 'projected_meets_target' || item.status === 'on_track'
                          ? 'var(--color-success-bg)'
                          : 'var(--color-bg-subtle)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-main)',
                      marginBottom: item.isFinal ? 0 : '0.75rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                    }}
                  >
                    {item.status === 'final_meets_target' || item.status === 'projected_meets_target' || item.status === 'on_track' ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }} />
                    ) : item.status === 'no_data' ? (
                      <Info size={16} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <AlertTriangle
                        size={16}
                        style={{
                          color:
                            item.status === 'final_below_target' || item.cannotReachTarget
                              ? 'var(--color-danger)'
                              : 'var(--color-warning)',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      />
                    )}
                    <span>{item.explanation}</span>
                  </div>

                  {/* Regression forecast (when incomplete) */}
                  {!item.isFinal && (
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
                        {item.regression.hasEnoughHistory ? (
                          item.regression.projectedMeetsTarget ? (
                            <TrendingUp size={16} style={{ flexShrink: 0 }} />
                          ) : (
                            <TrendingDown size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                          )
                        ) : (
                          <Info size={16} style={{ flexShrink: 0 }} />
                        )}
                        <span>Marks Regression Forecast (Estimate Only): {item.regression.summary}</span>
                      </div>
                      <div style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        {item.regression.disclaimer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
