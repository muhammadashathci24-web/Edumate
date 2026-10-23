export type UserRole = 'admin' | 'faculty' | 'student';
export type UserStatus = 'active' | 'disabled';

export interface ClassSection {
  department: string;
  year: number;
  section: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  year?: number;
  section?: string;
  usn?: string;
  phone?: string;
  assignedClasses?: ClassSection[];
  isDemo?: boolean;
  createdAt?: string;
}

export interface Student {
  usn: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  year: number;
  section: string;
  status: UserStatus;
  isDemo?: boolean;
  createdAt?: string;
}

export interface Course {
  code: string;
  title: string;
  department: string;
  year: number;
  sections: string[];
  facultyIds: string[];
  facultyNames: string[];
  isDemo?: boolean;
}

export interface Faculty {
  uid: string;
  name: string;
  initials?: string;
  email?: string;
  department: string;
  assignedClasses: ClassSection[];
  courseCodes?: string[];
  status: UserStatus;
  isDemo?: boolean;
  createdAt?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  department: string;
  year: number;
  section: string;
  dueDate: string;
  createdByFacultyId: string;
  facultyName: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  department: string;
  year: number;
  section: string;
  date: string;
  subject?: string;
  records: Record<string, 'present' | 'absent'>; // key: USN
  markedByFacultyId: string;
  createdAt: string;
}

export interface MarkRecord {
  id: string;
  department: string;
  year: number;
  section: string;
  assessmentTitle: string;
  maxMarks: number;
  records: Record<string, number>; // key: USN
  recordedByFacultyId: string;
  createdAt: string;
}

export interface SectionsConfig {
  departments: string[];
  years: number[];
  sectionsByDeptYear: Record<string, string[]>; // e.g. "AIML-3": ["A", "B", "C"]
}
