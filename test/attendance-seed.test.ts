import { describe, it, expect } from 'vitest';
import {
  INITIAL_ATTENDANCE,
  INITIAL_SECTIONS_CONFIG,
  SEMESTER_CONFIG,
  SEMESTER_TIMETABLE,
  DEMO_COURSES,
  DEMO_STUDENTS,
  buildSemesterAttendanceSeed,
} from '../server/seedData.js';

describe('Two-Month Semester Attendance Seed & Timetable Schedule', () => {
  it('configures a 12-week semester with an 85% attendance requirement and timetable', () => {
    expect(SEMESTER_CONFIG.semesterWeeks).toBe(12);
    expect(SEMESTER_CONFIG.seededHistoryWeeks).toBe(8);
    expect(SEMESTER_CONFIG.requiredAttendancePercentage).toBe(85);
    expect(INITIAL_SECTIONS_CONFIG.semesterWeeks).toBe(12);
    expect(INITIAL_SECTIONS_CONFIG.requiredAttendancePercentage).toBe(85);
    expect(INITIAL_SECTIONS_CONFIG.semesterStartDate).toBe('2026-09-28');
    expect(SEMESTER_TIMETABLE).toHaveLength(DEMO_COURSES.length);
    for (const entry of SEMESTER_TIMETABLE) {
      expect(entry.sessionsPerWeek).toBe(2);
      expect(entry.sections).toEqual(['A', 'B', 'C']);
    }
  });

  it('seeds exactly 8 weeks (first two full months) with 2 sessions per course per week per section', () => {
    // 8 courses * 3 sections (A, B, C) * 8 weeks * 2 sessions/week = 384 records
    expect(INITIAL_ATTENDANCE).toHaveLength(8 * 3 * 8 * 2);

    const weeksPresent = new Set(INITIAL_ATTENDANCE.map((a) => a.weekNumber));
    expect(Array.from(weeksPresent).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    // Ensure no records exist in weeks 9-12 (reserved for forecasting)
    expect(INITIAL_ATTENDANCE.some((a) => a.weekNumber > 8)).toBe(false);

    // Date span covers 2026-09-28 through 2026-11-20 (first two full months)
    const dates = INITIAL_ATTENDANCE.map((a) => a.date).sort();
    expect(dates[0]).toBe('2026-09-28');
    expect(dates[dates.length - 1]).toBe('2026-11-20');
  });

  it('keeps each record scoped to its course, section, and section students only', () => {
    const studentsBySection = new Map<string, Set<string>>();
    for (const stu of DEMO_STUDENTS) {
      if (!studentsBySection.has(stu.section)) {
        studentsBySection.set(stu.section, new Set());
      }
      studentsBySection.get(stu.section)!.add(stu.usn);
    }

    for (const att of INITIAL_ATTENDANCE) {
      const expectedUsns = studentsBySection.get(att.section)!;
      const recordedUsns = Object.keys(att.records);
      expect(recordedUsns).toHaveLength(expectedUsns.size);
      for (const usn of recordedUsns) {
        expect(expectedUsns.has(usn)).toBe(true);
      }
    }
  });

  it('is strictly deterministic across repeated seed generations', () => {
    const first = buildSemesterAttendanceSeed();
    const second = buildSemesterAttendanceSeed();
    expect(second).toEqual(first);
  });
});
