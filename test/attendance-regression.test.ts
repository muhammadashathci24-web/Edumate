import { describe, it, expect } from 'vitest';
import {
  groupAttendanceByWeek,
  computeAttendanceRegressionForecast,
  analyzeAttendanceByCourseSection,
  StudentAttendanceSession,
  CourseRef,
} from '../src/lib/attendanceAnalysis';

describe('Attendance Linear Regression Forecast & Course-Section Isolation', () => {
  it('requires at least 3 weeks with attendance data and shows guidance when fewer exist', () => {
    const twoWeeks: StudentAttendanceSession[] = [
      { id: '1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T', status: 'present' },
      { id: '2', date: '2026-10-12', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T', status: 'absent' },
    ];

    const reg = computeAttendanceRegressionForecast(twoWeeks);
    expect(reg.hasEnoughHistory).toBe(false);
    expect(reg.weeksCount).toBe(2);
    expect(reg.forecastNextWeekPercentage).toBeNull();
    expect(reg.summary).toBe('More attendance history is needed for a trend forecast');
    expect(reg.disclaimer.toLowerCase()).toContain('estimate only');
  });

  it('computes exact least-squares linear regression across 3+ weekly attendance percentages', () => {
    // Week 1 (Oct 5): 4/4 = 100%
    // Week 2 (Oct 12): 3/4 = 75%
    // Week 3 (Oct 19): 2/4 = 50%
    // Least squares line: y = -25x + 125 -> Week 4 (x=4) forecast = 25%
    const sessions: StudentAttendanceSession[] = [
      // Week 1
      { id: 'w1-1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: 'w1-2', date: '2026-10-06', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: 'w1-3', date: '2026-10-07', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: 'w1-4', date: '2026-10-08', department: 'AIML', year: 3, section: 'A', status: 'present' },
      // Week 2
      { id: 'w2-1', date: '2026-10-12', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: 'w2-2', date: '2026-10-13', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: 'w2-3', date: '2026-10-14', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: 'w2-4', date: '2026-10-15', department: 'AIML', year: 3, section: 'A', status: 'absent' },
      // Week 3
      { id: 'w3-1', date: '2026-10-19', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: 'w3-2', date: '2026-10-20', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: 'w3-3', date: '2026-10-21', department: 'AIML', year: 3, section: 'A', status: 'absent' },
      { id: 'w3-4', date: '2026-10-22', department: 'AIML', year: 3, section: 'A', status: 'absent' },
    ];

    const weekly = groupAttendanceByWeek(sessions);
    expect(weekly).toHaveLength(3);
    expect(weekly.map((w) => w.weekNumber)).toEqual([1, 2, 3]);
    expect(weekly.map((w) => w.percentage)).toEqual([100, 75, 50]);

    const reg = computeAttendanceRegressionForecast(sessions);
    expect(reg.hasEnoughHistory).toBe(true);
    expect(reg.slope).toBeCloseTo(-25, 8);
    expect(reg.intercept).toBeCloseTo(125, 8);
    expect(reg.forecastNextWeekPercentage).toBeCloseTo(25, 8);
    expect(reg.trendDirection).toBe('down');
    expect(reg.summary).toContain('Attendance is trending down');
    expect(reg.disclaimer.toLowerCase()).toContain('not an official attendance decision');
  });

  it('clamps forecasted percentage between 0% and 100%', () => {
    // Downward beyond 0%: Week 1 = 100%, Week 2 = 50%, Week 3 = 0% -> raw Week 4 = -50% -> clamped 0%
    const fallingFast: StudentAttendanceSession[] = [
      { id: '1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: '2', date: '2026-10-12', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: '3', date: '2026-10-13', department: 'AIML', year: 3, section: 'A', status: 'absent' },
      { id: '4', date: '2026-10-19', department: 'AIML', year: 3, section: 'A', status: 'absent' },
    ];
    const downReg = computeAttendanceRegressionForecast(fallingFast);
    expect(downReg.rawForecastPercentage).toBeLessThan(0);
    expect(downReg.forecastNextWeekPercentage).toBe(0);

    // Upward beyond 100%: Week 1 = 0%, Week 2 = 50%, Week 3 = 100% -> raw Week 4 = 150% -> clamped 100%
    const risingFast: StudentAttendanceSession[] = [
      { id: '1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', status: 'absent' },
      { id: '2', date: '2026-10-12', department: 'AIML', year: 3, section: 'A', status: 'present' },
      { id: '3', date: '2026-10-13', department: 'AIML', year: 3, section: 'A', status: 'absent' },
      { id: '4', date: '2026-10-19', department: 'AIML', year: 3, section: 'A', status: 'present' },
    ];
    const upReg = computeAttendanceRegressionForecast(risingFast);
    expect(upReg.rawForecastPercentage).toBeGreaterThan(100);
    expect(upReg.forecastNextWeekPercentage).toBe(100);
    expect(upReg.trendDirection).toBe('up');
  });

  it('does not let regression forecast alter exact safe future absences from threshold calculation', () => {
    const courses: CourseRef[] = [
      { code: 'BAI504T', title: 'Machine Learning', department: 'AIML', year: 3, sections: ['A'] },
    ];
    // 10 classes held, 9 attended (90%), trending down across 3 weeks:
    // Week 1: 4/4 (100%), Week 2: 3/3 (100%), Week 3: 2/3 (66.67%) -> trending down
    // Threshold with R=75%: floor(9/0.75 - 10) = floor(12 - 10) = 2 safe absences regardless of downward trend.
    const sessions: StudentAttendanceSession[] = [
      { id: '1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '2', date: '2026-10-06', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '3', date: '2026-10-07', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '4', date: '2026-10-08', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '5', date: '2026-10-12', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '6', date: '2026-10-13', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '7', date: '2026-10-14', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '8', date: '2026-10-19', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '9', date: '2026-10-20', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '10', date: '2026-10-21', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'absent' },
    ];

    const analyses = analyzeAttendanceByCourseSection(
      sessions,
      courses,
      { department: 'AIML', year: 3, section: 'A' },
      75
    );
    expect(analyses).toHaveLength(1);
    expect(analyses[0].regression.trendDirection).toBe('down');
    expect(analyses[0].threshold?.safeAbsences).toBe(2);
  });

  it('separates calculations independently per course and section and updates when records change', () => {
    const courses: CourseRef[] = [
      { code: 'BAI501G', title: 'Computer Vision', department: 'AIML', year: 3, sections: ['A', 'B'] },
      { code: 'BAI504T', title: 'Machine Learning', department: 'AIML', year: 3, sections: ['A', 'B'] },
    ];

    const initialSessions: StudentAttendanceSession[] = [
      // BAI504T Section A across 3 weeks
      { id: 'a1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: 'a2', date: '2026-10-12', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: 'a3', date: '2026-10-19', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      // BAI501G Section A (only 1 week, 1 absent)
      { id: 'b1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', subject: 'BAI501G - Computer Vision', status: 'absent' },
      // BAI504T Section B (must remain isolated from Section A)
      { id: 'c1', date: '2026-10-05', department: 'AIML', year: 3, section: 'B', subject: 'BAI504T - Machine Learning', status: 'absent' },
    ];

    const before = analyzeAttendanceByCourseSection(
      initialSessions,
      courses,
      { department: 'AIML', year: 3, section: 'A' },
      75
    );

    const mlSecA = before.find((x) => x.courseCode === 'BAI504T' && x.section === 'A')!;
    const cvSecA = before.find((x) => x.courseCode === 'BAI501G' && x.section === 'A')!;
    const mlSecB = before.find((x) => x.courseCode === 'BAI504T' && x.section === 'B')!;

    expect(mlSecA.attended).toBe(3);
    expect(mlSecA.held).toBe(3);
    expect(mlSecA.threshold?.safeAbsences).toBe(1); // 3/0.75 - 3 = 1
    expect(mlSecA.regression.hasEnoughHistory).toBe(true);
    expect(mlSecA.regression.trendDirection).toBe('stable');

    expect(cvSecA.attended).toBe(0);
    expect(cvSecA.held).toBe(1);
    expect(cvSecA.threshold?.isBelowRequirement).toBe(true);
    expect(cvSecA.regression.hasEnoughHistory).toBe(false);
    expect(cvSecA.regression.summary).toBe('More attendance history is needed for a trend forecast');

    expect(mlSecB.attended).toBe(0);
    expect(mlSecB.held).toBe(1);

    // Add a 4th week absent record to BAI504T Section A and verify both threshold & trend update
    const updatedSessions: StudentAttendanceSession[] = [
      ...initialSessions,
      { id: 'a4', date: '2026-10-26', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'absent' },
    ];

    const after = analyzeAttendanceByCourseSection(
      updatedSessions,
      courses,
      { department: 'AIML', year: 3, section: 'A' },
      75
    );
    const mlSecAAfter = after.find((x) => x.courseCode === 'BAI504T' && x.section === 'A')!;
    expect(mlSecAAfter.attended).toBe(3);
    expect(mlSecAAfter.held).toBe(4);
    expect(mlSecAAfter.threshold?.safeAbsences).toBe(0);
    expect(mlSecAAfter.regression.weeksCount).toBe(4);
    expect(mlSecAAfter.regression.trendDirection).toBe('down');
    expect(mlSecAAfter.regression.summary).toContain('Attendance is trending down');
  });
});
