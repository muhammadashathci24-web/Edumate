import { describe, it, expect } from 'vitest';
import {
  calculateAttendanceThreshold,
  computeAttendanceRegressionForecast,
  analyzeAttendanceByCourseSection,
  validateAttendanceRequirement,
  StudentAttendanceSession,
  CourseRef,
} from '../src/lib/attendanceAnalysis';
import { DEMO_COURSES, DEMO_FACULTY, DEMO_STUDENTS, INITIAL_SECTIONS_CONFIG } from '../server/seedData.js';

describe('Attendance Shortage Warnings Integration & Permissions Verification', () => {
  it('configures the institutional 85% attendance requirement and 12-week semester in local seed config', () => {
    expect((INITIAL_SECTIONS_CONFIG as any).requiredAttendancePercentage).toBe(85);
    expect((INITIAL_SECTIONS_CONFIG as any).semesterWeeks).toBe(12);
  });

  it('rejects invalid attendance policy percentages (<= 0 or > 100)', () => {
    expect(validateAttendanceRequirement(0).valid).toBe(false);
    expect(validateAttendanceRequirement(-5).valid).toBe(false);
    expect(validateAttendanceRequirement(105).valid).toBe(false);
    expect(validateAttendanceRequirement(75).valid).toBe(true);
    expect(validateAttendanceRequirement(100).valid).toBe(true);
  });

  it('keeps threshold null when admin has not configured an official requirement yet', () => {
    const courses: CourseRef[] = [
      { code: 'BAI504T', title: 'Machine Learning', department: 'AIML', year: 3, sections: ['A'] },
    ];
    const sessions: StudentAttendanceSession[] = [
      { id: '1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '2', date: '2026-10-12', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: '3', date: '2026-10-19', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'absent' },
    ];

    const unconfigured = analyzeAttendanceByCourseSection(
      sessions,
      courses,
      { department: 'AIML', year: 3, section: 'A' },
      null
    );
    expect(unconfigured).toHaveLength(1);
    expect(unconfigured[0].attended).toBe(2);
    expect(unconfigured[0].held).toBe(3);
    expect(unconfigured[0].threshold).toBeNull();
    expect(unconfigured[0].regression.hasEnoughHistory).toBe(true);
  });

  it('updates threshold and regression forecast immediately when an attendance record is added or modified', () => {
    const courses = DEMO_COURSES.filter(
      (c) => c.department === 'AIML' && c.year === 3 && c.sections.includes('A')
    ) as CourseRef[];

    const baseSessions: StudentAttendanceSession[] = [
      { id: 's1', date: '2026-10-05', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: 's2', date: '2026-10-12', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
      { id: 's3', date: '2026-10-19', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'present' },
    ];

    const step1 = analyzeAttendanceByCourseSection(
      baseSessions,
      courses,
      { department: 'AIML', year: 3, section: 'A' },
      75
    );
    const mlStep1 = step1.find((c) => c.courseCode === 'BAI504T')!;
    const cvStep1 = step1.find((c) => c.courseCode === 'BAI501G')!;

    expect(mlStep1.threshold?.safeAbsences).toBe(1);
    expect(mlStep1.regression.trendDirection).toBe('stable');
    expect(cvStep1.held).toBe(0);
    expect(cvStep1.threshold?.status).toBe('insufficient_data');
    expect(cvStep1.regression.summary).toBe('More attendance history is needed for a trend forecast');

    // Add a new absent session in week 4
    const withAddedAbsent: StudentAttendanceSession[] = [
      ...baseSessions,
      { id: 's4', date: '2026-10-26', department: 'AIML', year: 3, section: 'A', subject: 'BAI504T - Machine Learning', status: 'absent' },
    ];
    const step2 = analyzeAttendanceByCourseSection(
      withAddedAbsent,
      courses,
      { department: 'AIML', year: 3, section: 'A' },
      75
    );
    const mlStep2 = step2.find((c) => c.courseCode === 'BAI504T')!;
    expect(mlStep2.attended).toBe(3);
    expect(mlStep2.held).toBe(4);
    expect(mlStep2.threshold?.safeAbsences).toBe(0);
    expect(mlStep2.regression.trendDirection).toBe('down');

    // Modify that week 4 record from absent to present
    const withModifiedPresent: StudentAttendanceSession[] = withAddedAbsent.map((s) =>
      s.id === 's4' ? { ...s, status: 'present' } : s
    );
    const step3 = analyzeAttendanceByCourseSection(
      withModifiedPresent,
      courses,
      { department: 'AIML', year: 3, section: 'A' },
      75
    );
    const mlStep3 = step3.find((c) => c.courseCode === 'BAI504T')!;
    expect(mlStep3.attended).toBe(4);
    expect(mlStep3.held).toBe(4);
    expect(mlStep3.threshold?.safeAbsences).toBe(1);
    expect(mlStep3.regression.trendDirection).toBe('stable');
  });

  it('verifies faculty course-section assignment constraints from seed directory', () => {
    const mlFaculty = DEMO_FACULTY.find((f) => f.uid === 'fac-vk')!;
    const cvFaculty = DEMO_FACULTY.find((f) => f.uid === 'fac-am')!;
    const studentSecA = DEMO_STUDENTS.find((s) => s.section === 'A')!;

    expect(mlFaculty.courseCodes).toContain('BAI504T');
    expect(cvFaculty.courseCodes).not.toContain('BAI504T');
    expect(
      mlFaculty.assignedClasses.some(
        (c) =>
          c.department === studentSecA.department &&
          c.year === studentSecA.year &&
          c.section === studentSecA.section
      )
    ).toBe(true);

    // Ensure direct threshold & regression functions agree
    expect(calculateAttendanceThreshold(78, 100, 75).safeAbsences).toBe(4);
    expect(computeAttendanceRegressionForecast([]).summary).toBe(
      'More attendance history is needed for a trend forecast'
    );
  });
});
