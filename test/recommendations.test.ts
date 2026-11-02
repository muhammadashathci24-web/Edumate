import { describe, it, expect } from 'vitest';
import {
  matchOpportunities,
  isOpportunityExpired,
  checkAcademicEligibility,
  getDaysRemaining,
} from '../src/lib/recommendations';
import { Opportunity, Student, StudentInterests } from '../src/lib/types';

describe('Personalized Opportunity & Event Recommendations Engine', () => {
  const sampleStudent: Student = {
    usn: '1EM22AI001',
    uid: 'stu-001',
    name: 'Aarav Sharma',
    email: 'aarav@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    status: 'active',
  };

  const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const sampleOpportunities: Opportunity[] = [
    {
      id: 'opp-1',
      title: 'State AI & Robotics Hackathon 2026',
      category: 'Coding and technology',
      description: 'Annual 24-hour hackathon for building innovative AI applications.',
      interestTags: ['Coding and technology', 'AI and machine learning', 'hackathons'],
      subcategoryTags: ['AI and machine learning', 'hackathons', 'web development'],
      venue: 'Tech Innovation Hall',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['AIML', 'CSE', 'IS'],
      eligibleYears: [2, 3, 4],
      eligibleSections: ['ALL'],
      isActive: true,
      createdAt: '2026-10-01',
    },
    {
      id: 'opp-2',
      title: 'Inter-Collegiate Badminton Championship',
      category: 'Sports',
      description: 'Annual collegiate tournament for singles and doubles.',
      interestTags: ['Sports', 'badminton'],
      subcategoryTags: ['badminton'],
      venue: 'Sports Complex',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['ALL'],
      eligibleYears: [1, 2, 3, 4],
      eligibleSections: ['ALL'],
      isActive: true,
      createdAt: '2026-10-01',
    },
    {
      id: 'opp-3',
      title: 'Expired Tech Fest',
      category: 'Coding and technology',
      description: 'Past event with closed registration.',
      interestTags: ['Coding and technology'],
      subcategoryTags: ['web development'],
      venue: 'Auditorium',
      city: 'Bengaluru',
      eventDate: pastDate,
      registrationDeadline: pastDate,
      eligibleDepartments: ['ALL'],
      eligibleYears: [3],
      isActive: true,
      createdAt: '2026-09-01',
    },
    {
      id: 'opp-4',
      title: 'Inactive Workshop',
      category: 'Academic competitions and workshops',
      description: 'Draft workshop not yet approved.',
      interestTags: ['Academic competitions and workshops'],
      subcategoryTags: ['technical workshops'],
      venue: 'Room 101',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      isActive: false,
      createdAt: '2026-10-01',
    },
    {
      id: 'opp-5',
      title: 'Mechanical Engineering Design Expo',
      category: 'Academic competitions and workshops',
      description: 'CAD and automotive design exhibition.',
      interestTags: ['Academic competitions and workshops'],
      subcategoryTags: ['project exhibitions'],
      venue: 'Mech Lab',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['MECH'],
      eligibleYears: [3, 4],
      isActive: true,
      createdAt: '2026-10-01',
    },
    {
      id: 'opp-6',
      title: 'STEM Merit Excellence Scholarship',
      category: 'Scholarships',
      description: 'Annual merit scholarship for high academic achievers in technology.',
      interestTags: ['Scholarships', 'Coding and technology'],
      subcategoryTags: ['AI and machine learning'],
      venue: 'Online Application',
      city: 'Online / Virtual',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['AIML', 'CSE'],
      eligibleYears: [3],
      scholarshipDetails: {
        awardAmount: '₹50,000',
        minimumMarksPercentage: 75,
        criteriaNotes: 'Open to 3rd year students with 75%+ aggregate.',
      },
      isActive: true,
      createdAt: '2026-10-01',
    },
  ];

  it('correctly detects expired opportunities', () => {
    expect(isOpportunityExpired(sampleOpportunities[2])).toBe(true);
    expect(isOpportunityExpired(sampleOpportunities[0])).toBe(false);
  });

  it('filters out inactive and expired opportunities from recommendations', () => {
    const interests: StudentInterests = {
      categories: ['Coding and technology'],
      subcategories: ['AI and machine learning'],
      preferredCity: 'Bengaluru',
    };

    const results = matchOpportunities(sampleStudent, interests, sampleOpportunities);
    const resultIds = results.map((r) => r.opportunity.id);

    // Opp-3 is expired, Opp-4 is inactive
    expect(resultIds).not.toContain('opp-3');
    expect(resultIds).not.toContain('opp-4');
  });

  it('filters out opportunities by department eligibility', () => {
    const interests: StudentInterests = {
      categories: ['Academic competitions and workshops'],
      subcategories: ['project exhibitions'],
      preferredCity: 'Bengaluru',
    };

    // sampleStudent is AIML, opp-5 is MECH only
    const results = matchOpportunities(sampleStudent, interests, sampleOpportunities);
    const resultIds = results.map((r) => r.opportunity.id);

    expect(resultIds).not.toContain('opp-5');
  });

  it('ranks matching interests and location above non-matching opportunities', () => {
    const interests: StudentInterests = {
      categories: ['Coding and technology'],
      subcategories: ['AI and machine learning', 'hackathons'],
      preferredCity: 'Bengaluru',
    };

    const results = matchOpportunities(sampleStudent, interests, sampleOpportunities);
    expect(results.length).toBeGreaterThan(0);
    // The top ranked result should be opp-1 (AI Hackathon in Bengaluru)
    expect(results[0].opportunity.id).toBe('opp-1');
    expect(results[0].score).toBeGreaterThan(sampleOpportunities[1] ? 10 : 0);
  });

  it('produces explainable matchReasons for each recommended opportunity', () => {
    const interests: StudentInterests = {
      categories: ['Sports'],
      subcategories: ['badminton'],
      preferredCity: 'Bengaluru',
    };

    const results = matchOpportunities(sampleStudent, interests, sampleOpportunities);
    const badmintonMatch = results.find((r) => r.opportunity.id === 'opp-2');

    expect(badmintonMatch).toBeDefined();
    expect(badmintonMatch!.matchReasons.length).toBeGreaterThan(0);
    expect(badmintonMatch!.matchReasons.some((r) => r.includes('Sports'))).toBe(true);
    expect(badmintonMatch!.matchReasons.some((r) => r.includes('Bengaluru'))).toBe(true);
  });

  it('checks scholarship eligibility rules against average marks', () => {
    const oppScholarship = sampleOpportunities[5]; // requires 75% marks

    // Student with 80% marks qualifies
    const eligibleCheck = checkAcademicEligibility(oppScholarship, sampleStudent, 80);
    expect(eligibleCheck.isEligible).toBe(true);

    // Student with 65% marks does not qualify
    const ineligibleCheck = checkAcademicEligibility(oppScholarship, sampleStudent, 65);
    expect(ineligibleCheck.isEligible).toBe(false);
    expect(ineligibleCheck.reason).toContain('minimum 75%');
  });

  describe('Sample Student Records & Interests Integrity', () => {
    it('verifies all 30 sample students have stable assigned interests for local dev', async () => {
      const { DEMO_STUDENTS } = await import('../server/seedData.js');
      expect(DEMO_STUDENTS).toHaveLength(30);

      const allCategories = new Set<string>();
      DEMO_STUDENTS.forEach((student) => {
        expect(student.interests).toBeDefined();
        expect(student.interests?.categories.length).toBeGreaterThan(0);
        expect(student.interests?.subcategories.length).toBeGreaterThan(0);
        expect(student.interests?.preferredCity).toBeTruthy();
        student.interests?.categories.forEach((cat) => allCategories.add(cat));
      });

      // Confirms all core domains are represented
      expect(allCategories.has('Sports')).toBe(true);
      expect(allCategories.has('Coding and technology')).toBe(true);
      expect(allCategories.has('Cultural and arts activities')).toBe(true);
      expect(allCategories.has('Academic competitions and workshops')).toBe(true);
      expect(allCategories.has('Entrepreneurship and social impact')).toBe(true);
    });
  });
});
