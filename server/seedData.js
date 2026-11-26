// Sample data strictly for local development and demonstration.
// Preserved as non-visible local development seeds.

export const DEMO_PASSWORD = 'Demo@12345';

export const DEMO_ADMIN = {
  uid: 'admin-001',
  email: 'admin@example.edu',
  name: 'Administrator',
  role: 'admin',
  status: 'active',
  isSampleData: true,
};

// 8 Curriculum Courses for 3rd-year AIML students (Sections A, B, C)
// Note: Credits not verified; left blank/uninvented until officially supplied.
export const DEMO_COURSES = [
  {
    code: 'BAI501G',
    title: 'Computer Vision',
    department: 'AIML',
    year: 3,
    sections: ['A', 'B', 'C'],
    facultyIds: ['fac-am'],
    facultyNames: ['Mr. Arjun Menon'],
    isSampleData: true,
  },
  {
    code: 'BAI502G',
    title: 'Computer Network and Its Applications',
    department: 'AIML',
    year: 3,
    sections: ['A', 'B', 'C'],
    facultyIds: ['fac-kr'],
    facultyNames: ['Dr. Kavitha Rao'],
    isSampleData: true,
  },
  {
    code: 'BAI503T',
    title: 'Automata Theory and Computability',
    department: 'AIML',
    year: 3,
    sections: ['A', 'B', 'C'],
    facultyIds: ['fac-ns'],
    facultyNames: ['Ms. Nandini Shetty'],
    isSampleData: true,
  },
  {
    code: 'BAI504T',
    title: 'Machine Learning',
    department: 'AIML',
    year: 3,
    sections: ['A', 'B', 'C'],
    facultyIds: ['fac-vk'],
    facultyNames: ['Dr. Vivek Kulkarni'],
    isSampleData: true,
  },
  {
    code: 'BAI505L',
    title: 'Machine Learning Laboratory',
    department: 'AIML',
    year: 3,
    sections: ['A', 'B', 'C'],
    facultyIds: ['fac-vk', 'fac-an'],
    facultyNames: ['Dr. Vivek Kulkarni', 'Mrs. Asha Nair'],
    isSampleData: true,
  },
  {
    code: 'BAI506E2',
    title: 'Intelligent Process Automation',
    department: 'AIML',
    year: 3,
    sections: ['A', 'B', 'C'],
    facultyIds: ['fac-ph'],
    facultyNames: ['Mr. Pranav Hegde'],
    isSampleData: true,
  },
  {
    code: 'BBS508AK',
    title: 'Research Methodology and IPR',
    department: 'AIML',
    year: 3,
    sections: ['A', 'B', 'C'],
    facultyIds: ['fac-md'],
    facultyNames: ['Dr. Meera Desai'],
    isSampleData: true,
  },
  {
    code: 'BBS509TK',
    title: 'Environmental Studies',
    department: 'AIML',
    year: 3,
    sections: ['A', 'B', 'C'],
    facultyIds: ['fac-di'],
    facultyNames: ['Ms. Divya Iyer'],
    isSampleData: true,
  },
];

const AIML_YEAR_3_SECTIONS = [
  { department: 'AIML', year: 3, section: 'A' },
  { department: 'AIML', year: 3, section: 'B' },
  { department: 'AIML', year: 3, section: 'C' },
];

// Faculty Directory Profiles
// Note: In accordance with guidelines, no email addresses, phone numbers, or passwords are invented.
export const DEMO_FACULTY = [
  {
    uid: 'fac-am',
    name: 'Mr. Arjun Menon',
    initials: 'AM',
    department: 'AIML',
    role: 'faculty',
    status: 'active',
    isSampleData: true,
    assignedClasses: AIML_YEAR_3_SECTIONS,
    courseCodes: ['BAI501G'],
  },
  {
    uid: 'fac-kr',
    name: 'Dr. Kavitha Rao',
    initials: 'KR',
    department: 'AIML',
    role: 'faculty',
    status: 'active',
    isSampleData: true,
    assignedClasses: AIML_YEAR_3_SECTIONS,
    courseCodes: ['BAI502G'],
  },
  {
    uid: 'fac-ns',
    name: 'Ms. Nandini Shetty',
    initials: 'NS',
    department: 'AIML',
    role: 'faculty',
    status: 'active',
    isSampleData: true,
    assignedClasses: AIML_YEAR_3_SECTIONS,
    courseCodes: ['BAI503T'],
  },
  {
    uid: 'fac-vk',
    name: 'Dr. Vivek Kulkarni',
    initials: 'VK',
    department: 'AIML',
    role: 'faculty',
    status: 'active',
    isSampleData: true,
    assignedClasses: AIML_YEAR_3_SECTIONS,
    courseCodes: ['BAI504T', 'BAI505L'],
  },
  {
    uid: 'fac-an',
    name: 'Mrs. Asha Nair',
    initials: 'AN',
    department: 'AIML',
    role: 'faculty',
    status: 'active',
    isSampleData: true,
    assignedClasses: AIML_YEAR_3_SECTIONS,
    courseCodes: ['BAI505L'],
  },
  {
    uid: 'fac-ph',
    name: 'Mr. Pranav Hegde',
    initials: 'PH',
    department: 'AIML',
    role: 'faculty',
    status: 'active',
    isSampleData: true,
    assignedClasses: AIML_YEAR_3_SECTIONS,
    courseCodes: ['BAI506E2'],
  },
  {
    uid: 'fac-md',
    name: 'Dr. Meera Desai',
    initials: 'MD',
    department: 'AIML',
    role: 'faculty',
    status: 'active',
    isSampleData: true,
    assignedClasses: AIML_YEAR_3_SECTIONS,
    courseCodes: ['BBS508AK'],
  },
  {
    uid: 'fac-di',
    name: 'Ms. Divya Iyer',
    initials: 'DI',
    department: 'AIML',
    role: 'faculty',
    status: 'active',
    isSampleData: true,
    assignedClasses: AIML_YEAR_3_SECTIONS,
    courseCodes: ['BBS509TK'],
  },
];

// Exactly 30 natural student records:
// 10 3rd-year AIML Section A
// 10 3rd-year AIML Section B
// 10 3rd-year AIML Section C
// Non-deliverable @example.edu domain, missing phone numbers left uninvented.
export const DEMO_STUDENTS = [
  // Section A (10 students)
  {
    usn: '1EM22AI001',
    uid: 'stu-ai3a-001',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Coding and technology', 'Sports'],
      subcategories: ['AI and machine learning', 'hackathons', 'badminton'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI002',
    uid: 'stu-ai3a-002',
    name: 'Bhavya Patel',
    email: 'bhavya.patel@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Cultural and arts activities', 'Academic competitions and workshops'],
      subcategories: ['music', 'dance', 'technical workshops'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI003',
    uid: 'stu-ai3a-003',
    name: 'Chirag Rao',
    email: 'chirag.rao@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Sports', 'Entrepreneurship and social impact'],
      subcategories: ['cricket', 'football', 'volunteering'],
      preferredCity: 'Mysuru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI004',
    uid: 'stu-ai3a-004',
    name: 'Divya Nair',
    email: 'divya.nair@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Coding and technology'],
      subcategories: ['web development', 'app development', 'hackathons'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI005',
    uid: 'stu-ai3a-005',
    name: 'Eshan Iyer',
    email: 'eshan.iyer@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Academic competitions and workshops', 'Coding and technology', 'Other'],
      subcategories: ['project exhibitions', 'paper presentations', 'robotics'],
      customInterests: ['autonomous robotics'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI006',
    uid: 'stu-ai3a-006',
    name: 'Fatima Khan',
    email: 'fatima.khan@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Cultural and arts activities', 'Entrepreneurship and social impact'],
      subcategories: ['photography', 'drawing and painting', 'social-impact events'],
      preferredCity: 'Mangaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI007',
    uid: 'stu-ai3a-007',
    name: 'Gautam Menon',
    email: 'gautam.menon@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Sports'],
      subcategories: ['volleyball', 'basketball', 'table tennis'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI008',
    uid: 'stu-ai3a-008',
    name: 'Harini Reddy',
    email: 'harini.reddy@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Coding and technology', 'Academic competitions and workshops'],
      subcategories: ['cybersecurity', 'competitive programming', 'quizzes'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI009',
    uid: 'stu-ai3a-009',
    name: 'Ishaan Joshi',
    email: 'ishaan.joshi@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Entrepreneurship and social impact', 'Coding and technology', 'Other'],
      subcategories: ['entrepreneurship', 'app development'],
      customInterests: ['edtech ventures'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI010',
    uid: 'stu-ai3a-010',
    name: 'Janhavi Bhat',
    email: 'janhavi.bhat@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Cultural and arts activities', 'Academic competitions and workshops'],
      subcategories: ['drama', 'debate and public speaking', 'paper presentations'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },

  // Section B (10 students)
  {
    usn: '1EM22AI011',
    uid: 'stu-ai3b-011',
    name: 'Kabir Deshmukh',
    email: 'kabir.deshmukh@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Sports', 'Coding and technology'],
      subcategories: ['football', 'athletics', 'web development'],
      preferredCity: 'Hubballi-Dharwad',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI012',
    uid: 'stu-ai3b-012',
    name: 'Lavanya Gowda',
    email: 'lavanya.gowda@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Cultural and arts activities', 'Academic competitions and workshops'],
      subcategories: ['dance', 'music', 'technical workshops'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI013',
    uid: 'stu-ai3b-013',
    name: 'Manas Hegde',
    email: 'manas.hegde@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Coding and technology', 'Other'],
      subcategories: ['AI and machine learning', 'competitive programming'],
      customInterests: ['deep learning ethics'],
      preferredCity: 'Mysuru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI014',
    uid: 'stu-ai3b-014',
    name: 'Neha Verma',
    email: 'neha.verma@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Entrepreneurship and social impact', 'Cultural and arts activities'],
      subcategories: ['volunteering', 'social-impact events', 'literature'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI015',
    uid: 'stu-ai3b-015',
    name: 'Omkar Kulkarni',
    email: 'omkar.kulkarni@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Sports', 'Academic competitions and workshops'],
      subcategories: ['cricket', 'badminton', 'quizzes'],
      preferredCity: 'Belagavi',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI016',
    uid: 'stu-ai3b-016',
    name: 'Pooja Pillai',
    email: 'pooja.pillai@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Coding and technology'],
      subcategories: ['cybersecurity', 'app development'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI017',
    uid: 'stu-ai3b-017',
    name: 'Rahul Gupta',
    email: 'rahul.gupta@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Academic competitions and workshops', 'Coding and technology'],
      subcategories: ['project exhibitions', 'technical workshops', 'robotics'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI018',
    uid: 'stu-ai3b-018',
    name: 'Sneha Shetty',
    email: 'sneha.shetty@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Cultural and arts activities'],
      subcategories: ['photography', 'quiz', 'debate and public speaking'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI019',
    uid: 'stu-ai3b-019',
    name: 'Tarun Nambiar',
    email: 'tarun.nambiar@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Sports', 'Entrepreneurship and social impact'],
      subcategories: ['table tennis', 'basketball', 'entrepreneurship'],
      preferredCity: 'Mangaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI020',
    uid: 'stu-ai3b-020',
    name: 'Urvi Choudhury',
    email: 'urvi.choudhury@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Coding and technology', 'Cultural and arts activities'],
      subcategories: ['web development', 'hackathons', 'music'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },

  // Section C (10 students)
  {
    usn: '1EM22AI021',
    uid: 'stu-ai3c-021',
    name: 'Varun Saxena',
    email: 'varun.saxena@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Sports', 'Academic competitions and workshops'],
      subcategories: ['athletics', 'kabaddi', 'technical workshops'],
      preferredCity: 'Kalaburagi',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI022',
    uid: 'stu-ai3c-022',
    name: 'Vidya Somayaji',
    email: 'vidya.somayaji@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Cultural and arts activities', 'Entrepreneurship and social impact'],
      subcategories: ['drawing and painting', 'literature', 'volunteering'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI023',
    uid: 'stu-ai3c-023',
    name: 'Yash Kapoor',
    email: 'yash.kapoor@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Coding and technology', 'Entrepreneurship and social impact'],
      subcategories: ['AI and machine learning', 'hackathons', 'entrepreneurship'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI024',
    uid: 'stu-ai3c-024',
    name: 'Zara Ahmed',
    email: 'zara.ahmed@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Academic competitions and workshops'],
      subcategories: ['paper presentations', 'project exhibitions'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI025',
    uid: 'stu-ai3c-025',
    name: 'Ananya Sen',
    email: 'ananya.sen@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Cultural and arts activities', 'Sports'],
      subcategories: ['drama', 'dance', 'badminton'],
      preferredCity: 'Mysuru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI026',
    uid: 'stu-ai3c-026',
    name: 'Bharat Nayak',
    email: 'bharat.nayak@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Sports', 'Coding and technology'],
      subcategories: ['cricket', 'volleyball', 'app development'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI027',
    uid: 'stu-ai3c-027',
    name: 'Chetana Das',
    email: 'chetana.das@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Coding and technology', 'Academic competitions and workshops'],
      subcategories: ['competitive programming', 'web development', 'quizzes'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI028',
    uid: 'stu-ai3c-028',
    name: 'Deepak Roy',
    email: 'deepak.roy@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Entrepreneurship and social impact', 'Sports'],
      subcategories: ['social-impact events', 'volunteering', 'athletics'],
      preferredCity: 'Hubballi-Dharwad',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI029',
    uid: 'stu-ai3c-029',
    name: 'Ekta Swamy',
    email: 'ekta.swamy@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Cultural and arts activities', 'Coding and technology'],
      subcategories: ['music', 'photography', 'AI and machine learning'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
  {
    usn: '1EM22AI030',
    uid: 'stu-ai3c-030',
    name: 'Farhan Qureshi',
    email: 'farhan.qureshi@example.edu',
    department: 'AIML',
    year: 3,
    section: 'C',
    role: 'student',
    status: 'active',
    isSampleData: true,
    interests: {
      categories: ['Academic competitions and workshops', 'Coding and technology', 'Other'],
      subcategories: ['project exhibitions', 'technical workshops', 'cybersecurity'],
      customInterests: ['cloud security'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    },
  },
];

// Three-month (12-week) semester schedule & institutional eligibility rules
export const SEMESTER_CONFIG = {
  semesterWeeks: 12,
  seededHistoryWeeks: 8,
  semesterStartDate: '2026-09-28', // Monday of Week 1; Weeks 1-8 cover 2026-09-28..2026-11-22 (2 full months)
  requiredAttendancePercentage: 85,
  internalAssessmentsCount: 3,
  internalMaxMarks: 30,
  requiredInternalAverage: 12,
};

// Stable weekly timetable: 2 class sessions per course per week for Sections A, B, and C
const COURSE_DAY_SLOTS = {
  BAI501G: [0, 2],  // Mon, Wed
  BAI502G: [1, 3],  // Tue, Thu
  BAI503T: [0, 3],  // Mon, Thu
  BAI504T: [1, 4],  // Tue, Fri
  BAI505L: [2, 4],  // Wed, Fri
  BAI506E2: [0, 4], // Mon, Fri
  BBS508AK: [1, 2], // Tue, Wed
  BBS509TK: [3, 4], // Thu, Fri
};

export const SEMESTER_TIMETABLE = DEMO_COURSES.map((course) => ({
  courseCode: course.code,
  department: course.department,
  year: course.year,
  sections: [...course.sections],
  sessionsPerWeek: 2,
  dayOffsets: COURSE_DAY_SLOTS[course.code] || [0, 2],
}));

// Initial Sections Config
export const INITIAL_SECTIONS_CONFIG = {
  departments: ['AIML', 'CSE', 'IS', 'MECH', 'EC', 'Robotics'],
  years: [1, 2, 3, 4],
  requiredAttendancePercentage: SEMESTER_CONFIG.requiredAttendancePercentage,
  semesterWeeks: SEMESTER_CONFIG.semesterWeeks,
  semesterStartDate: SEMESTER_CONFIG.semesterStartDate,
  timetable: SEMESTER_TIMETABLE,
  sectionsByDeptYear: {
    'AIML-3': ['A', 'B', 'C'],
    'AIML-1': ['A'],
    'AIML-2': ['A', 'B'],
    'AIML-4': ['A'],
    'CSE-1': ['A', 'B'],
    'CSE-2': ['A', 'B'],
    'CSE-3': ['A', 'B'],
    'CSE-4': ['A'],
    'IS-1': ['A'],
    'IS-2': ['A'],
    'IS-3': ['A'],
    'IS-4': ['A'],
    'MECH-1': ['A'],
    'MECH-2': ['A'],
    'MECH-3': ['A'],
    'MECH-4': ['A'],
    'EC-1': ['A', 'B'],
    'EC-2': ['A', 'B'],
    'EC-3': ['A', 'B'],
    'EC-4': ['A'],
    'Robotics-1': ['A'],
    'Robotics-2': ['A'],
    'Robotics-3': ['A'],
    'Robotics-4': ['A'],
  },
};

// Initial Sample Assignments
export const INITIAL_ASSIGNMENTS = [
  {
    id: 'asg-001',
    title: 'Assignment 1: Neural Network Backpropagation Fundamentals',
    description: 'Implement gradient descent calculations and backprop steps for a 2-layer perceptron by hand, then summarize findings.',
    department: 'AIML',
    year: 3,
    section: 'A',
    dueDate: '2026-11-15',
    createdByFacultyId: 'fac-vk',
    facultyName: 'Dr. Vivek Kulkarni',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asg-002',
    title: 'Assignment 2: Heuristic Search & Alpha-Beta Pruning',
    description: 'Solve the game-tree minimax problem with alpha-beta pruning optimization steps.',
    department: 'AIML',
    year: 3,
    section: 'B',
    dueDate: '2026-11-18',
    createdByFacultyId: 'fac-am',
    facultyName: 'Mr. Arjun Menon',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asg-003',
    title: 'Assignment 1: Natural Language Preprocessing Pipeline',
    description: 'Design tokenization and lemmatization pipeline comparison report for domain texts.',
    department: 'AIML',
    year: 3,
    section: 'C',
    dueDate: '2026-11-20',
    createdByFacultyId: 'fac-kr',
    facultyName: 'Dr. Kavitha Rao',
    createdAt: new Date().toISOString(),
  },
];

function addUtcDays(baseYmd, daysToAdd) {
  const [y, m, d] = baseYmd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  return dt.toISOString().slice(0, 10);
}

/**
 * Deterministic 8-week (first two full months) attendance status for local/test seed data.
 * Uses no randomness so attendance history stays identical across reloads.
 */
function deterministicSessionStatus(studentIdx, courseIdx, weekNumber, slotIdx) {
  const sessionIdx = (weekNumber - 1) * 2 + slotIdx; // 0..15

  // Showcase realistic scenarios for the first student in Section A (1EM22AI001):
  // - Course 3 (BAI504T): 14/16 = 87.5% currently above 85%, but Weeks 7 & 8 drop to 50% -> projected < 85%
  // - Course 2 (BAI503T): 13/16 = 81.25% -> currently below 85%
  // - Course 0 (BAI501G): 15/16 = 93.75% -> above 85%, 1 safe absence
  // - Other courses: 16/16 = 100% -> above 85%
  if (studentIdx === 0) {
    if (courseIdx === 3) {
      return (weekNumber === 7 || weekNumber === 8) && slotIdx === 1 ? 'absent' : 'present';
    }
    if (courseIdx === 2) {
      return sessionIdx === 3 || sessionIdx === 9 || sessionIdx === 14 ? 'absent' : 'present';
    }
    if (courseIdx === 0) {
      return sessionIdx === 5 ? 'absent' : 'present';
    }
    return 'present';
  }

  // Deterministic pattern across all 30 students and 8 courses:
  // produces a realistic mix of 100%, 93.75%, 87.5%, 81.25%, and 75% courses.
  const bucket = (studentIdx * 5 + courseIdx * 3) % 8;
  if (bucket === 0) {
    // 16/16 (100%)
    return 'present';
  }
  if (bucket === 1 || bucket === 2) {
    // 15/16 (93.75%)
    const missIdx = (studentIdx + courseIdx) % 16;
    return sessionIdx === missIdx ? 'absent' : 'present';
  }
  if (bucket === 3 || bucket === 4) {
    // 14/16 (87.5%), with some late-semester dips to demonstrate downward forecasts
    if (bucket === 4) {
      return (weekNumber === 7 || weekNumber === 8) && slotIdx === 1 ? 'absent' : 'present';
    }
    return sessionIdx === 2 || sessionIdx === 10 ? 'absent' : 'present';
  }
  if (bucket === 5 || bucket === 6) {
    // 13/16 (81.25% - below 85%)
    return sessionIdx === 1 || sessionIdx === 7 || sessionIdx === 13 ? 'absent' : 'present';
  }
  // 12/16 (75% - below 85%)
  return sessionIdx === 0 || sessionIdx === 5 || sessionIdx === 11 || sessionIdx === 15
    ? 'absent'
    : 'present';
}

export function buildSemesterAttendanceSeed() {
  const attendanceList = [];
  const studentsBySection = new Map();

  for (const stu of DEMO_STUDENTS) {
    const secStudents = studentsBySection.get(stu.section) || [];
    secStudents.push(stu);
    studentsBySection.set(stu.section, secStudents);
  }

  const sections = ['A', 'B', 'C'];
  for (const section of sections) {
    const secStudents = studentsBySection.get(section) || [];
    for (let week = 1; week <= SEMESTER_CONFIG.seededHistoryWeeks; week++) {
      for (let courseIdx = 0; courseIdx < DEMO_COURSES.length; courseIdx++) {
        const course = DEMO_COURSES[courseIdx];
        const timetableEntry = SEMESTER_TIMETABLE[courseIdx];
        const dayOffsets = timetableEntry?.dayOffsets || [0, 2];

        for (let slotIdx = 0; slotIdx < dayOffsets.length; slotIdx++) {
          const daysFromStart = (week - 1) * 7 + dayOffsets[slotIdx];
          const date = addUtcDays(SEMESTER_CONFIG.semesterStartDate, daysFromStart);
          const records = {};

          for (let stuIdx = 0; stuIdx < secStudents.length; stuIdx++) {
            const stu = secStudents[stuIdx];
            records[stu.usn] = deterministicSessionStatus(
              stuIdx,
              courseIdx,
              week,
              slotIdx
            );
          }

          attendanceList.push({
            id: `att-${course.code}-${section}-w${String(week).padStart(2, '0')}-s${slotIdx + 1}`,
            department: course.department,
            year: course.year,
            section,
            date,
            weekNumber: week,
            courseCode: course.code,
            subject: `${course.code} - ${course.title}`,
            markedByFacultyId: course.facultyIds[0],
            createdAt: `${date}T10:00:00.000Z`,
            isSampleData: true,
            records,
          });
        }
      }
    }
  }

  return attendanceList.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

// Initial Attendance (Deterministic first 8 weeks of the 12-week semester; Weeks 9-12 reserved for forecasting)
export const INITIAL_ATTENDANCE = buildSemesterAttendanceSeed();

function deterministicInternalScore(studentIdx, courseIdx, internalNumber) {
  // Showcase explicit test scenarios for first student in Section A (1EM22AI001):
  if (studentIdx === 0) {
    // BAI504T: 10 and 14 -> avg 12, 12 needed in Internal 3, regression predicts 18 -> projected 14
    if (courseIdx === 3) return internalNumber === 1 ? 10 : 14;
    // BAI502G: 14 and 9 -> avg 11.5 (currently below target), regression predicts 4 -> projected 9 (projected below 12)
    if (courseIdx === 1) return internalNumber === 1 ? 14 : 9;
    // BAI503T: 2 and 3 -> sum 5, needs 31 (> 30) -> impossible to reach 12 average
    if (courseIdx === 2) return internalNumber === 1 ? 2 : 3;
    // BAI501G (all 3 recorded): 22, 24, 26 -> final avg 24/30 (meets 12)
    if (courseIdx === 0) return 20 + internalNumber * 2;
    // BBS509TK (all 3 recorded): 9, 10, 11 -> final avg 10/30 (does not meet 12)
    if (courseIdx === 7) return 8 + internalNumber;
    // BAI506E2 (only 1 recorded): 10/30
    if (courseIdx === 5) return 10;
    // BAI505L, BBS508AK: solid scores
    return 18 + internalNumber * 2;
  }

  const base = 10 + ((studentIdx * 5 + courseIdx * 3 + internalNumber * 2) % 17); // 10..26
  return Math.min(30, Math.max(0, base));
}

export function buildSemesterMarksSeed() {
  const marksList = [];
  const studentsBySection = new Map();

  for (const stu of DEMO_STUDENTS) {
    const secStudents = studentsBySection.get(stu.section) || [];
    secStudents.push(stu);
    studentsBySection.set(stu.section, secStudents);
  }

  const sections = ['A', 'B', 'C'];
  for (const section of sections) {
    const secStudents = studentsBySection.get(section) || [];
    for (let courseIdx = 0; courseIdx < DEMO_COURSES.length; courseIdx++) {
      const course = DEMO_COURSES[courseIdx];
      // Course 0 & 7 have all 3 internals; Course 5 has 1 internal; others have 2 internals recorded
      const internalsCount =
        courseIdx === 0 || courseIdx === 7 ? 3 : courseIdx === 5 ? 1 : 2;

      for (let internalNum = 1; internalNum <= internalsCount; internalNum++) {
        const records = {};
        for (let stuIdx = 0; stuIdx < secStudents.length; stuIdx++) {
          const stu = secStudents[stuIdx];
          records[stu.usn] = deterministicInternalScore(stuIdx, courseIdx, internalNum);
        }

        const day = internalNum === 1 ? '2026-10-16' : internalNum === 2 ? '2026-11-13' : '2026-11-20';
        marksList.push({
          id: `mrk-${course.code}-${section}-ia${internalNum}`,
          department: course.department,
          year: course.year,
          section,
          courseCode: course.code,
          internalNumber: internalNum,
          assessmentTitle: `${course.code} - Internal ${internalNum}`,
          maxMarks: SEMESTER_CONFIG.internalMaxMarks,
          recordedByFacultyId: course.facultyIds[0],
          createdAt: `${day}T11:00:00.000Z`,
          isSampleData: true,
          records,
        });
      }
    }
  }

  return marksList;
}

// Initial Marks (30-mark internals per course & section)
export const INITIAL_MARKS = buildSemesterMarksSeed();

// Initial Opportunities Catalog (Sample test data for development & recommendations)
export const INITIAL_OPPORTUNITIES = [
  {
    id: 'opp-ai-hackathon-2026',
    title: 'Inter-Collegiate AI & Intelligent Automation Hackathon',
    category: 'Coding and technology',
    description: '36-hour team challenge to develop practical AI agents, machine learning pipelines, and automation tools for educational institutions.',
    interestTags: ['Coding and technology', 'AI and machine learning', 'hackathons'],
    subcategoryTags: ['AI and machine learning', 'hackathons', 'web development'],
    venue: 'Centre of Innovation, Campus Annex',
    city: 'Bengaluru',
    area: 'Campus Hall A',
    eventDate: '2026-11-28T09:00:00.000Z',
    registrationDeadline: '2026-11-22T23:59:00.000Z',
    registrationLink: 'https://example.edu/register/ai-hackathon-2026',
    eligibleDepartments: ['AIML', 'CSE', 'IS'],
    eligibleYears: [2, 3, 4],
    eligibleSections: ['ALL'],
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
  {
    id: 'opp-badminton-cup-2026',
    title: 'Inter-Department Badminton & Table Tennis Championship',
    category: 'Sports',
    description: 'Annual college sports meet featuring singles and doubles knockout tournaments with certificates and winner trophies.',
    interestTags: ['Sports', 'badminton', 'table tennis'],
    subcategoryTags: ['badminton', 'table tennis', 'athletics'],
    venue: 'University Indoor Sports Complex',
    city: 'Bengaluru',
    area: 'Sports Pavilion',
    eventDate: '2026-11-25T10:00:00.000Z',
    registrationDeadline: '2026-11-20T18:00:00.000Z',
    registrationLink: 'https://example.edu/sports/badminton-championship',
    eligibleDepartments: ['ALL'],
    eligibleYears: [1, 2, 3, 4],
    eligibleSections: ['ALL'],
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
  {
    id: 'opp-cultural-fest-2026',
    title: 'Tarangini Cultural Arts Showcase & Music Fest',
    category: 'Cultural and arts activities',
    description: 'Annual cultural stage celebration featuring classical and western music, group dance, street drama, and photography exhibitions.',
    interestTags: ['Cultural and arts activities', 'music', 'dance', 'drama', 'photography'],
    subcategoryTags: ['music', 'dance', 'drama', 'photography'],
    venue: 'Main Campus Open Air Theatre',
    city: 'Bengaluru',
    area: 'Campus Quadrangle',
    eventDate: '2026-12-05T16:00:00.000Z',
    registrationDeadline: '2026-11-30T20:00:00.000Z',
    registrationLink: 'https://example.edu/cultural/tarangini-2026',
    eligibleDepartments: ['ALL'],
    eligibleYears: [1, 2, 3, 4],
    eligibleSections: ['ALL'],
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
  {
    id: 'opp-tech-paper-expo-2026',
    title: 'Undergraduate Technical Research & Paper Presentation',
    category: 'Academic competitions and workshops',
    description: 'Peer-reviewed student symposium for submitting conference papers and demonstrating capstone engineering project prototypes.',
    interestTags: ['Academic competitions and workshops', 'paper presentations', 'project exhibitions'],
    subcategoryTags: ['paper presentations', 'project exhibitions', 'technical workshops'],
    venue: 'Sir M.V. Auditorium, Central Library',
    city: 'Bengaluru',
    area: 'Central Academic Block',
    eventDate: '2026-12-10T09:30:00.000Z',
    registrationDeadline: '2026-12-01T23:59:00.000Z',
    registrationLink: 'https://example.edu/academics/paper-symposium',
    eligibleDepartments: ['AIML', 'CSE', 'IS', 'MECH', 'EC', 'Robotics'],
    eligibleYears: [3, 4],
    eligibleSections: ['ALL'],
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
  {
    id: 'opp-social-impact-2026',
    title: 'Community Tech Literacy & Volunteering Drive',
    category: 'Entrepreneurship and social impact',
    description: 'Hands-on weekend volunteering initiative helping local community high schools adopt computer literacy and introductory coding tools.',
    interestTags: ['Entrepreneurship and social impact', 'volunteering', 'social-impact events'],
    subcategoryTags: ['volunteering', 'social-impact events', 'entrepreneurship'],
    venue: 'Govt. PU College & Community Centre',
    city: 'Bengaluru',
    area: 'South Bengaluru',
    eventDate: '2026-11-29T08:30:00.000Z',
    registrationDeadline: '2026-11-24T17:00:00.000Z',
    registrationLink: 'https://example.edu/volunteer/tech-literacy',
    eligibleDepartments: ['ALL'],
    eligibleYears: [1, 2, 3, 4],
    eligibleSections: ['ALL'],
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
  {
    id: 'opp-merit-scholarship-2026',
    title: 'Merit Excellence Scholarship in Artificial Intelligence',
    category: 'Scholarships',
    description: 'Endowment financial grant awarded to high-performing 3rd-year engineering students demonstrating consistent academic merit and technical innovation.',
    interestTags: ['Coding and technology', 'AI and machine learning'],
    subcategoryTags: ['AI and machine learning', 'competitive programming'],
    venue: 'Dean of Academic Affairs Office',
    city: 'Online / Virtual',
    area: 'Administrative Block',
    eventDate: '2026-12-15T12:00:00.000Z',
    registrationDeadline: '2026-12-05T23:59:00.000Z',
    registrationLink: 'https://example.edu/scholarships/merit-ai-grant',
    eligibleDepartments: ['AIML'],
    eligibleYears: [3],
    eligibleSections: ['ALL'],
    scholarshipDetails: {
      awardAmount: '₹40,000 per academic term',
      minimumMarksPercentage: 75,
      criteriaNotes: 'Available to 3rd-year AIML students with 75% or higher cumulative assessment average.',
    },
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
  {
    id: 'opp-web-dev-workshop-2026',
    title: 'Full-Stack Modern Cloud & React Masterclass',
    category: 'Coding and technology',
    description: 'Comprehensive 2-day interactive workshop covering high-performance TypeScript, modern React patterns, and serverless deployment.',
    interestTags: ['Coding and technology', 'web development', 'app development'],
    subcategoryTags: ['web development', 'app development'],
    venue: 'Virtual Seminar Room 2',
    city: 'Online / Virtual',
    area: 'Virtual Campus',
    eventDate: '2026-11-21T14:00:00.000Z',
    registrationDeadline: '2026-11-19T23:59:00.000Z',
    registrationLink: 'https://example.edu/workshops/react-cloud-2026',
    eligibleDepartments: ['ALL'],
    eligibleYears: [1, 2, 3, 4],
    eligibleSections: ['ALL'],
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
  {
    id: 'opp-entrepreneurship-pitch-2026',
    title: 'Campus Startup Incubator & Venture Pitch Challenge',
    category: 'Entrepreneurship and social impact',
    description: 'Pitch your entrepreneurial prototype or social enterprise concept to industry mentors and angel investment networks for seed grants.',
    interestTags: ['Entrepreneurship and social impact', 'entrepreneurship'],
    subcategoryTags: ['entrepreneurship', 'social-impact events'],
    venue: 'Incubation Centre Conference Hall',
    city: 'Bengaluru',
    area: 'Innovation Park',
    eventDate: '2026-12-12T10:00:00.000Z',
    registrationDeadline: '2026-12-02T18:00:00.000Z',
    registrationLink: 'https://example.edu/incubator/pitch-challenge-2026',
    eligibleDepartments: ['ALL'],
    eligibleYears: [2, 3, 4],
    eligibleSections: ['ALL'],
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
  {
    id: 'opp-cricket-football-tournament-2026',
    title: 'State Inter-Collegiate Cricket & Football League',
    category: 'Sports',
    description: 'Premier inter-collegiate championship for men and women division cricket and football squads.',
    interestTags: ['Sports', 'cricket', 'football', 'athletics'],
    subcategoryTags: ['cricket', 'football', 'athletics'],
    venue: 'City Stadium Complex',
    city: 'Bengaluru',
    area: 'East Bengaluru',
    eventDate: '2026-12-08T08:00:00.000Z',
    registrationDeadline: '2026-11-28T18:00:00.000Z',
    registrationLink: 'https://example.edu/sports/cricket-league-2026',
    eligibleDepartments: ['ALL'],
    eligibleYears: [1, 2, 3, 4],
    eligibleSections: ['ALL'],
    isActive: true,
    createdAt: '2026-10-20T00:00:00.000Z',
    isSampleData: true,
  },
];
