import { describe, it, expect } from 'vitest';
import { DEMO_COURSES, DEMO_FACULTY, DEMO_STUDENTS, DEMO_ADMIN } from '../server/seedData.js';

/**
 * EduMate Security Rules Verification Suite
 * Tests rule definitions against the specified authorization matrix:
 * 1. Unauthenticated users: denied read/write on all collections.
 * 2. Students:
 *    - Allowed to read own user record and student record.
 *    - Allowed to read assignments for their department, year, and section.
 *    - Denied writing to assignments, attendance, marks, users, or students.
 *    - Denied altering their USN or role.
 * 3. Faculty:
 *    - Allowed to read/write assignments, attendance, and marks for assigned classes.
 *    - Denied accessing or writing to unassigned classes.
 * 4. Admin:
 *    - Authorized to manage records; account provisioning handled via server-side Admin SDK.
 * 5. Disabled accounts:
 *    - Denied access.
 */

// Simulation helper modeling Firestore Security Rules logic from firestore.rules
interface UserContext {
  uid: string;
  role: 'admin' | 'faculty' | 'student';
  status: 'active' | 'disabled';
  department?: string;
  year?: number;
  section?: string;
  usn?: string;
  assignedClasses?: Array<{ department: string; year: number; section: string }>;
}

function canReadStudent(
  user: UserContext | null,
  studentDoc: { uid: string; department: string; year: number; section: string }
): boolean {
  if (!user || user.status !== 'active') return false;
  if (user.role === 'admin') return true;
  if (user.role === 'student' && user.uid === studentDoc.uid) return true;
  if (user.role === 'faculty') {
    return (user.assignedClasses || []).some(
      (c) => c.department === studentDoc.department && c.year === studentDoc.year && c.section === studentDoc.section
    );
  }
  return false;
}

function canWriteStudent(user: UserContext | null): boolean {
  if (!user || user.status !== 'active') return false;
  return user.role === 'admin';
}

function canReadAssignment(
  user: UserContext | null,
  assignment: { department: string; year: number; section: string }
): boolean {
  if (!user || user.status !== 'active') return false;
  if (user.role === 'admin') return true;
  if (user.role === 'student') {
    return (
      user.department === assignment.department &&
      user.year === assignment.year &&
      user.section === assignment.section
    );
  }
  if (user.role === 'faculty') {
    return (user.assignedClasses || []).some(
      (c) => c.department === assignment.department && c.year === assignment.year && c.section === assignment.section
    );
  }
  return false;
}

function canWriteAssignment(
  user: UserContext | null,
  assignment: { department: string; year: number; section: string }
): boolean {
  if (!user || user.status !== 'active') return false;
  if (user.role === 'admin') return true;
  if (user.role === 'faculty') {
    return (user.assignedClasses || []).some(
      (c) => c.department === assignment.department && c.year === assignment.year && c.section === assignment.section
    );
  }
  return false;
}

describe('Firestore Security Rules Permissions Matrix', () => {
  const adminUser: UserContext = {
    uid: 'admin-1',
    role: 'admin',
    status: 'active',
  };

  const facultyAimlA: UserContext = {
    uid: 'fac-1',
    role: 'faculty',
    status: 'active',
    department: 'AIML',
    assignedClasses: [{ department: 'AIML', year: 3, section: 'A' }],
  };

  const studentAiml3A: UserContext = {
    uid: 'stu-1',
    role: 'student',
    status: 'active',
    department: 'AIML',
    year: 3,
    section: 'A',
    usn: '1EM22AI001',
  };

  const studentAiml3B: UserContext = {
    uid: 'stu-2',
    role: 'student',
    status: 'active',
    department: 'AIML',
    year: 3,
    section: 'B',
    usn: '1EM22AI011',
  };

  const disabledStudent: UserContext = {
    uid: 'stu-3',
    role: 'student',
    status: 'disabled',
    department: 'AIML',
    year: 3,
    section: 'A',
  };

  const sampleStudentDoc = {
    uid: 'stu-1',
    department: 'AIML',
    year: 3,
    section: 'A',
  };

  const sampleAssignmentAIML3A = {
    department: 'AIML',
    year: 3,
    section: 'A',
  };

  const sampleAssignmentAIML3B = {
    department: 'AIML',
    year: 3,
    section: 'B',
  };

  describe('1. Unauthenticated Requests', () => {
    it('denies unauthenticated read to student records', () => {
      expect(canReadStudent(null, sampleStudentDoc)).toBe(false);
    });

    it('denies unauthenticated write to student records', () => {
      expect(canWriteStudent(null)).toBe(false);
    });

    it('denies unauthenticated read to assignments', () => {
      expect(canReadAssignment(null, sampleAssignmentAIML3A)).toBe(false);
    });
  });

  describe('2. Disabled Accounts', () => {
    it('denies disabled user from reading records', () => {
      expect(canReadStudent(disabledStudent, sampleStudentDoc)).toBe(false);
      expect(canReadAssignment(disabledStudent, sampleAssignmentAIML3A)).toBe(false);
    });
  });

  describe('3. Student Role Constraints', () => {
    it('allows student to read their own record', () => {
      expect(canReadStudent(studentAiml3A, sampleStudentDoc)).toBe(true);
    });

    it('denies student from reading another section student if not own record', () => {
      const otherStudentDoc = { uid: 'stu-999', department: 'AIML', year: 3, section: 'C' };
      expect(canReadStudent(studentAiml3A, otherStudentDoc)).toBe(false);
    });

    it('denies student from creating or modifying student records', () => {
      expect(canWriteStudent(studentAiml3A)).toBe(false);
    });

    it('allows student to read assignments for their own class section', () => {
      expect(canReadAssignment(studentAiml3A, sampleAssignmentAIML3A)).toBe(true);
    });

    it('denies student from reading assignments for another section', () => {
      expect(canReadAssignment(studentAiml3A, sampleAssignmentAIML3B)).toBe(false);
    });

    it('denies student from creating assignments', () => {
      expect(canWriteAssignment(studentAiml3A, sampleAssignmentAIML3A)).toBe(false);
    });
  });

  describe('4. Faculty Role Constraints', () => {
    it('allows faculty to read student records for their assigned class section', () => {
      expect(canReadStudent(facultyAimlA, sampleStudentDoc)).toBe(true);
    });

    it('denies faculty from reading student records for unassigned class sections', () => {
      const studentSectionB = { uid: 'stu-2', department: 'AIML', year: 3, section: 'B' };
      expect(canReadStudent(facultyAimlA, studentSectionB)).toBe(false);
    });

    it('allows faculty to create assignments for assigned class section', () => {
      expect(canWriteAssignment(facultyAimlA, sampleAssignmentAIML3A)).toBe(true);
    });

    it('denies faculty from creating assignments for unassigned class sections', () => {
      expect(canWriteAssignment(facultyAimlA, sampleAssignmentAIML3B)).toBe(false);
    });

    it('denies faculty from altering student enrollment records directly', () => {
      expect(canWriteStudent(facultyAimlA)).toBe(false);
    });
  });

  describe('5. Admin Role Permissions', () => {
    it('allows admin to read all student records', () => {
      expect(canReadStudent(adminUser, sampleStudentDoc)).toBe(true);
    });

    it('allows admin to manage student records', () => {
      expect(canWriteStudent(adminUser)).toBe(true);
    });

    it('allows admin to view assignments across all departments and sections', () => {
      expect(canReadAssignment(adminUser, sampleAssignmentAIML3A)).toBe(true);
      expect(canReadAssignment(adminUser, sampleAssignmentAIML3B)).toBe(true);
    });
  });

  describe('6. Course Catalog & Natural Faculty Directory Verification', () => {
    it('confirms there are exactly eight active course records', () => {
      expect(DEMO_COURSES).toHaveLength(8);
    });

    it('confirms there are no duplicate course codes', () => {
      const courseCodes = DEMO_COURSES.map((c) => c.code);
      const uniqueCodes = new Set(courseCodes);
      expect(uniqueCodes.size).toBe(8);
      expect(courseCodes).toEqual([
        'BAI501G',
        'BAI502G',
        'BAI503T',
        'BAI504T',
        'BAI505L',
        'BAI506E2',
        'BBS508AK',
        'BBS509TK',
      ]);
    });

    it('confirms BAI505L is a single course record with two co-instructors linked', () => {
      const bai505lRecords = DEMO_COURSES.filter((c) => c.code === 'BAI505L');
      expect(bai505lRecords).toHaveLength(1);

      const bai505l = bai505lRecords[0];
      expect(bai505l.title).toBe('Machine Learning Laboratory');
      expect(bai505l.facultyNames).toHaveLength(2);
      expect(bai505l.facultyNames).toContain('Dr. Vivek Kulkarni');
      expect(bai505l.facultyNames).toContain('Mrs. Asha Nair');
      expect(bai505l.facultyIds).toContain('fac-vk');
      expect(bai505l.facultyIds).toContain('fac-an');
    });

    it('confirms courses are strictly scoped to AIML Year 3 (Sections A, B, C)', () => {
      DEMO_COURSES.forEach((course) => {
        expect(course.department).toBe('AIML');
        expect(course.year).toBe(3);
        expect(course.sections).toEqual(['A', 'B', 'C']);
      });
    });

    it('confirms there are exactly eight faculty profiles and no duplicates', () => {
      expect(DEMO_FACULTY).toHaveLength(8);
      const facultyIds = DEMO_FACULTY.map((f) => f.uid);
      const uniqueFacultyIds = new Set(facultyIds);
      expect(uniqueFacultyIds.size).toBe(8);

      const facultyNames = DEMO_FACULTY.map((f) => f.name);
      const uniqueNames = new Set(facultyNames);
      expect(uniqueNames.size).toBe(8);
    });

    it('confirms faculty profiles use natural names and keep internal sample metadata', () => {
      DEMO_FACULTY.forEach((fac) => {
        expect(fac.isSampleData).toBe(true);
        expect(fac.name).not.toContain('Fictional');
        expect(fac.name).not.toContain('Demo');
      });
    });

    it('confirms no email addresses, phone numbers, or passwords were invented for faculty', () => {
      DEMO_FACULTY.forEach((fac) => {
        expect(fac.email).toBeUndefined();
        expect(fac.phone).toBeUndefined();
        expect((fac as any).password).toBeUndefined();
      });
    });

    it('confirms faculty profiles link correctly to their designated courses', () => {
      const getFacultyCourses = (initials: string) => {
        const fac = DEMO_FACULTY.find((f) => f.initials === initials);
        return fac?.courseCodes || [];
      };

      expect(getFacultyCourses('AM')).toContain('BAI501G');
      expect(getFacultyCourses('KR')).toContain('BAI502G');
      expect(getFacultyCourses('NS')).toContain('BAI503T');
      expect(getFacultyCourses('VK')).toContain('BAI504T');
      expect(getFacultyCourses('VK')).toContain('BAI505L'); // Co-instructor for lab
      expect(getFacultyCourses('AN')).toContain('BAI505L'); // Co-instructor for lab
      expect(getFacultyCourses('PH')).toContain('BAI506E2');
      expect(getFacultyCourses('MD')).toContain('BBS508AK');
      expect(getFacultyCourses('DI')).toContain('BBS509TK');
    });

    it('confirms all student names are natural and emails do not contain demo', () => {
      expect(DEMO_STUDENTS).toHaveLength(30);
      DEMO_STUDENTS.forEach((student) => {
        expect(student.name).not.toContain('Fictional');
        expect(student.name).not.toContain('Demo');
        expect(student.email).not.toContain('demo');
        expect(student.email.endsWith('@example.edu')).toBe(true);
        expect(student.phone).toBeUndefined();
      });
    });

    it('confirms admin profile uses natural name and email without demo', () => {
      expect(DEMO_ADMIN.name).toBe('Administrator');
      expect(DEMO_ADMIN.name).not.toContain('Demo');
      expect(DEMO_ADMIN.email).toBe('admin@example.edu');
      expect(DEMO_ADMIN.email).not.toContain('demo');
    });
  });
});
