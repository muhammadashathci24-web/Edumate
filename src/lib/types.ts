export type UserRole = 'admin' | 'faculty' | 'student';
export type UserStatus = 'active' | 'disabled';

export interface ClassSection {
  department: string;
  year: number;
  section: string;
}

export interface StudentInterests {
  categories: string[];
  subcategories: string[];
  customInterests?: string[];
  preferredCity?: string;
  preferredArea?: string;
  updatedAt?: string;
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
  courseCodes?: string[];
  interests?: StudentInterests;
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
  interests?: StudentInterests;
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
  type?: string;
  credits?: number;
  isDemo?: boolean;
}

export interface Faculty {
  uid: string;
  name: string;
  initials?: string;
  email?: string;
  phone?: string;
  department: string;
  assignedClasses: ClassSection[];
  courseCodes?: string[];
  status: UserStatus;
  isDemo?: boolean;
  isFictionalDemo?: boolean;
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
  weekNumber?: number;
  subject?: string;
  courseCode?: string;
  records: Record<string, 'present' | 'absent'>; // key: USN
  markedByFacultyId: string;
  createdAt: string;
}

export interface MarkRecord {
  id: string;
  department: string;
  year: number;
  section: string;
  courseCode?: string;
  internalNumber?: 1 | 2 | 3;
  assessmentTitle: string;
  maxMarks: number;
  records: Record<string, number>; // key: USN
  recordedByFacultyId: string;
  createdAt: string;
}

export interface TimetableEntry {
  courseCode: string;
  department: string;
  year: number;
  sections: string[];
  sessionsPerWeek: number;
  dayOffsets: number[]; // 0=Mon .. 4=Fri
}

export interface AttendanceConfig {
  requiredAttendancePercentage: number | null;
  semesterWeeks?: number;
  semesterStartDate?: string | null;
  timetable?: TimetableEntry[];
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface SectionsConfig {
  departments: string[];
  years: number[];
  sectionsByDeptYear: Record<string, string[]>; // e.g. "AIML-3": ["A", "B", "C"]
  requiredAttendancePercentage?: number | null;
  semesterWeeks?: number;
  semesterStartDate?: string | null;
  timetable?: TimetableEntry[];
  attendanceRequirementUpdatedAt?: string | null;
  attendanceRequirementUpdatedBy?: string | null;
}

export type OpportunityCategory =
  | 'Sports'
  | 'Coding and technology'
  | 'Cultural and arts activities'
  | 'Academic competitions and workshops'
  | 'Entrepreneurship and social impact'
  | 'Scholarships'
  | 'Other';

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  description: string;
  interestTags: string[];
  subcategoryTags: string[];
  venue: string;
  city: string;
  area?: string;
  eventDate: string; // ISO string or YYYY-MM-DD
  registrationDeadline: string; // ISO string or YYYY-MM-DD
  registrationLink?: string;
  eligibleDepartments?: string[]; // e.g. ['ALL'] or ['AIML', 'CSE']
  eligibleYears?: number[]; // e.g. [1, 2, 3, 4]
  eligibleSections?: string[]; // e.g. ['ALL'] or ['A', 'B']
  scholarshipDetails?: {
    awardAmount?: string;
    minimumMarksPercentage?: number;
    criteriaNotes?: string;
  };
  isActive: boolean;
  createdByAdminId?: string;
  createdAt: string;
  updatedAt?: string;
  isSampleData?: boolean;
}

export interface RecommendationMatch {
  opportunity: Opportunity;
  score: number;
  similarityScore: number;
  matchReasons: string[];
  matchedInterests: string[];
  eligibilityDetail?: string;
  scholarshipEligibilityDetail?: string;
  locationDetail?: string;
  isLocationMatch: boolean;
  isEligible: boolean;
  daysRemaining: number;
}
