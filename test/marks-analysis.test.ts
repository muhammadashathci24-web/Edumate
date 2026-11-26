import { describe, it, expect } from 'vitest';
import {
  analyzeMarksByCourseSection,
  evaluateCourseInternals,
} from '../src/lib/marksAnalysis';
import { CourseRef } from '../src/lib/attendanceAnalysis';
import { INITIAL_MARKS, DEMO_COURSES } from '../server/seedData.js';

describe('Three-Internal Marks Tracking, 12/30 Threshold & Regression Forecast', () => {
  it('handles 1 recorded internal without fitting regression and calculates remaining average needed', () => {
    const res = evaluateCourseInternals(
      [
        {
          internalNumber: 1,
          score: 10,
          rawScore: 10,
          rawMaxMarks: 30,
          assessmentTitle: 'BAI506E2 - Internal 1',
        },
      ],
      {
        key: 'BAI506E2::AIML::3::A',
        courseCode: 'BAI506E2',
        courseTitle: 'Intelligent Process Automation',
        displayName: 'BAI506E2 — Intelligent Process Automation',
        department: 'AIML',
        year: 3,
        section: 'A',
      }
    );

    expect(res.recordedCount).toBe(1);
    expect(res.remainingCount).toBe(2);
    expect(res.currentAverage).toBe(10);
    expect(res.requiredRemainingAverage).toBe(13); // (36 - 10) / 2 = 13
    expect(res.cannotReachTarget).toBe(false);
    expect(res.isFinal).toBe(false);
    expect(res.status).toBe('currently_below_target');
    expect(res.statusLabel).toBe('Currently below target');
    expect(res.regression.hasEnoughHistory).toBe(false);
  });

  it('handles 10/30 and 14/30 with 1 internal remaining: current average 12, 12 needed, regression predicts Internal 3', () => {
    const res = evaluateCourseInternals(
      [
        {
          internalNumber: 1,
          score: 10,
          rawScore: 10,
          rawMaxMarks: 30,
          assessmentTitle: 'BAI504T - Internal 1',
        },
        {
          internalNumber: 2,
          score: 14,
          rawScore: 14,
          rawMaxMarks: 30,
          assessmentTitle: 'BAI504T - Internal 2',
        },
      ],
      {
        key: 'BAI504T::AIML::3::A',
        courseCode: 'BAI504T',
        courseTitle: 'Machine Learning',
        displayName: 'BAI504T — Machine Learning',
        department: 'AIML',
        year: 3,
        section: 'A',
      }
    );

    expect(res.recordedCount).toBe(2);
    expect(res.remainingCount).toBe(1);
    expect(res.currentAverage).toBe(12);
    expect(res.requiredRemainingAverage).toBe(12); // (36 - 24) / 1 = 12
    expect(res.cannotReachTarget).toBe(false);
    expect(res.regression.hasEnoughHistory).toBe(true);
    expect(res.regression.slope).toBeCloseTo(4, 8);
    expect(res.regression.predictedRemainingInternals[0].clampedPredictedScore).toBeCloseTo(18, 8);
    expect(res.regression.projectedFinalAverage).toBeCloseTo(14, 8);
    expect(res.regression.projectedMeetsTarget).toBe(true);
    expect(res.explanation).toContain('10/30 and 14/30 recorded');
    expect(res.explanation).toContain('Current average: 12/30');
    expect(res.explanation).toContain('12 marks are needed');
  });

  it('identifies when required average in remaining internals exceeds 30', () => {
    const res = evaluateCourseInternals(
      [
        {
          internalNumber: 1,
          score: 2,
          rawScore: 2,
          rawMaxMarks: 30,
          assessmentTitle: 'BAI503T - Internal 1',
        },
        {
          internalNumber: 2,
          score: 3,
          rawScore: 3,
          rawMaxMarks: 30,
          assessmentTitle: 'BAI503T - Internal 2',
        },
      ],
      {
        key: 'BAI503T::AIML::3::A',
        courseCode: 'BAI503T',
        courseTitle: 'Automata Theory',
        displayName: 'BAI503T — Automata Theory',
        department: 'AIML',
        year: 3,
        section: 'A',
      }
    );

    expect(res.sumRecorded).toBe(5);
    expect(res.rawRequiredRemainingAverage).toBe(31);
    expect(res.cannotReachTarget).toBe(true);
    expect(res.status).toBe('impossible_to_reach');
    expect(res.explanation).toContain('exceeds the maximum 30 marks');
    expect(res.explanation).toContain('(36 - 5) / 1 = 31');
  });

  it('clamps predicted score to [0, 30] and flags Projected below 12 when declining', () => {
    // 14 -> 4 => slope -10 => Internal 3 raw = -6 => clamped to 0
    // Projected avg = (14 + 4 + 0) / 3 = 6 < 12
    const res = evaluateCourseInternals(
      [
        { internalNumber: 1, score: 14, rawScore: 14, rawMaxMarks: 30, assessmentTitle: 'IA 1' },
        { internalNumber: 2, score: 4, rawScore: 4, rawMaxMarks: 30, assessmentTitle: 'IA 2' },
      ],
      {
        key: 'C::AIML::3::A',
        courseCode: 'C',
        courseTitle: 'Test',
        displayName: 'C — Test',
        department: 'AIML',
        year: 3,
        section: 'A',
      }
    );

    expect(res.regression.predictedRemainingInternals[0].rawPredictedScore).toBeCloseTo(-6, 8);
    expect(res.regression.predictedRemainingInternals[0].clampedPredictedScore).toBe(0);
    expect(res.regression.projectedFinalAverage).toBeCloseTo(6, 8);
    expect(res.status).toBe('projected_below_target');
    expect(res.statusLabel).toBe('Projected below 12');
  });

  it('uses actual final average rather than prediction when all 3 internals are recorded', () => {
    const meets = evaluateCourseInternals(
      [
        { internalNumber: 1, score: 10, rawScore: 10, rawMaxMarks: 30, assessmentTitle: 'IA 1' },
        { internalNumber: 2, score: 12, rawScore: 12, rawMaxMarks: 30, assessmentTitle: 'IA 2' },
        { internalNumber: 3, score: 14, rawScore: 14, rawMaxMarks: 30, assessmentTitle: 'IA 3' },
      ],
      {
        key: 'BAI501G::AIML::3::A',
        courseCode: 'BAI501G',
        courseTitle: 'Computer Vision',
        displayName: 'BAI501G — Computer Vision',
        department: 'AIML',
        year: 3,
        section: 'A',
      }
    );
    expect(meets.isFinal).toBe(true);
    expect(meets.actualFinalAverage).toBe(12);
    expect(meets.status).toBe('final_meets_target');
    expect(meets.statusLabel).toBe('Final average meets 12');
    expect(meets.regression.hasEnoughHistory).toBe(false);

    const below = evaluateCourseInternals(
      [
        { internalNumber: 1, score: 9, rawScore: 9, rawMaxMarks: 30, assessmentTitle: 'IA 1' },
        { internalNumber: 2, score: 10, rawScore: 10, rawMaxMarks: 30, assessmentTitle: 'IA 2' },
        { internalNumber: 3, score: 11, rawScore: 11, rawMaxMarks: 30, assessmentTitle: 'IA 3' },
      ],
      {
        key: 'BBS509TK::AIML::3::A',
        courseCode: 'BBS509TK',
        courseTitle: 'Environmental Studies',
        displayName: 'BBS509TK — Environmental Studies',
        department: 'AIML',
        year: 3,
        section: 'A',
      }
    );
    expect(below.isFinal).toBe(true);
    expect(below.actualFinalAverage).toBe(10);
    expect(below.status).toBe('final_below_target');
    expect(below.statusLabel).toBe('Final average does not meet 12');
  });

  it('keeps courses and sections strictly isolated when analyzing seeded marks', () => {
    const courses = DEMO_COURSES as CourseRef[];
    const studentMarks = INITIAL_MARKS.filter(
      (m) => m.department === 'AIML' && m.year === 3 && m.section === 'A'
    ).map((m) => ({
      id: m.id,
      assessmentTitle: m.assessmentTitle,
      maxMarks: m.maxMarks,
      obtainedMarks: (m.records as Record<string, number>)['1EM22AI001'] ?? null,
      department: m.department,
      year: m.year,
      section: m.section,
      courseCode: m.courseCode,
      internalNumber: m.internalNumber,
    }));

    const analyses = analyzeMarksByCourseSection(studentMarks, courses, {
      department: 'AIML',
      year: 3,
      section: 'A',
    });

    expect(analyses).toHaveLength(8);
    const ml = analyses.find((a) => a.courseCode === 'BAI504T')!;
    const automata = analyses.find((a) => a.courseCode === 'BAI503T')!;
    const cv = analyses.find((a) => a.courseCode === 'BAI501G')!;
    const ipa = analyses.find((a) => a.courseCode === 'BAI506E2')!;

    expect(ml.currentAverage).toBe(12);
    expect(ml.requiredRemainingAverage).toBe(12);
    expect(automata.cannotReachTarget).toBe(true);
    expect(cv.isFinal).toBe(true);
    expect(cv.status).toBe('final_meets_target');
    expect(ipa.recordedCount).toBe(1);
    expect(ipa.regression.hasEnoughHistory).toBe(false);
  });
});
