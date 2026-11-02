import { describe, it, expect } from 'vitest';
import {
  matchOpportunities,
  isOpportunityExpired,
  checkAcademicEligibility,
  tokenizeText,
  computeTfIdfVectors,
  computeCosineSimilarity,
  COSINE_SIMILARITY_THRESHOLD,
  STOP_WORDS,
} from '../src/lib/recommendations';
import { Opportunity, Student, StudentInterests } from '../src/lib/types';
import { INITIAL_OPPORTUNITIES } from '../server/seedData.js';

describe('Personalized Opportunity & Event Recommendations Engine (TF-IDF & Strict Gate)', () => {
  const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const testStudent: Student = {
    usn: '1EM22AI001',
    uid: 'stu-001',
    name: 'Aarav Sharma',
    email: 'aarav@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    status: 'active',
  };

  describe('TF-IDF Vectorization & Tokenization Core', () => {
    it('normalizes tokens and excludes stop words and generic domain terms', () => {
      const text = 'Annual scholarship opportunity for students to register and participate in AI machine learning event';
      const tokens = tokenizeText(text);

      // Stop words and generic words must be excluded
      expect(tokens).not.toContain('scholarship');
      expect(tokens).not.toContain('opportunity');
      expect(tokens).not.toContain('students');
      expect(tokens).not.toContain('student');
      expect(tokens).not.toContain('register');
      expect(tokens).not.toContain('participate');
      expect(tokens).not.toContain('event');
      expect(tokens).not.toContain('annual');
      expect(tokens).not.toContain('for');
      expect(tokens).not.toContain('and');
      expect(tokens).not.toContain('in');

      // Domain topic tokens and bigrams must be preserved
      expect(tokens).toContain('ai');
      expect(tokens).toContain('machine');
      expect(tokens).toContain('learning');
      expect(tokens).toContain('machine_learning');
    });

    it('calculates TF-IDF vectors and positive cosine similarity for matching content', () => {
      const studentTokens = tokenizeText('Coding and technology AI and machine learning hackathons');
      const opp1Tokens = tokenizeText('Inter-Collegiate AI Intelligent Automation Hackathon');
      const opp2Tokens = tokenizeText('Inter-Department Badminton Table Tennis Championship');

      const { studentVector, opportunityVectors } = computeTfIdfVectors(studentTokens, [
        { id: 'opp-ai', tokens: opp1Tokens },
        { id: 'opp-sports', tokens: opp2Tokens },
      ]);

      const simAi = computeCosineSimilarity(studentVector, opportunityVectors.get('opp-ai')!);
      const simSports = computeCosineSimilarity(studentVector, opportunityVectors.get('opp-sports')!);

      expect(simAi).toBeGreaterThan(COSINE_SIMILARITY_THRESHOLD);
      expect(simSports).toBe(0); // Zero overlap between AI hackathon and Badminton
    });
  });

  describe('Screenshot Scenario: Student with Cultural & Academic Interests (Bhavya Patel)', () => {
    // Exactly matches the student profile from the screenshot
    const bhavyaStudent: Student = {
      usn: '1EM22AI002',
      uid: 'stu-ai3a-002',
      name: 'Bhavya Patel',
      email: 'bhavya.patel@example.edu',
      department: 'AIML',
      year: 3,
      section: 'A',
      status: 'active',
    };

    const bhavyaInterests: StudentInterests = {
      categories: ['Cultural and arts activities', 'Academic competitions and workshops'],
      subcategories: ['music', 'dance', 'technical workshops'],
      preferredCity: 'Bengaluru',
      updatedAt: '2026-10-21T00:00:00.000Z',
    };

    it('recommends cultural showcase and academic research expo matching saved interests', () => {
      const results = matchOpportunities(bhavyaStudent, bhavyaInterests, INITIAL_OPPORTUNITIES as Opportunity[], 84);
      const matchedIds = results.map((r) => r.opportunity.id);

      // Must recommend Cultural Fest and Technical Paper Expo
      expect(matchedIds).toContain('opp-cultural-fest-2026');
      expect(matchedIds).toContain('opp-tech-paper-expo-2026');
    });

    it('does NOT recommend an AI/ML scholarship to a student without coding/AI interests', () => {
      const results = matchOpportunities(bhavyaStudent, bhavyaInterests, INITIAL_OPPORTUNITIES as Opportunity[], 84);
      const matchedIds = results.map((r) => r.opportunity.id);

      // opp-merit-scholarship-2026 is tagged with AI & ML and competitive programming
      // Bhavya has NOT selected Coding/AI interests -> must NOT appear!
      expect(matchedIds).not.toContain('opp-merit-scholarship-2026');
    });

    it('does NOT recommend unrelated sports events to a student who has not selected Sports', () => {
      const results = matchOpportunities(bhavyaStudent, bhavyaInterests, INITIAL_OPPORTUNITIES as Opportunity[], 84);
      const matchedIds = results.map((r) => r.opportunity.id);

      expect(matchedIds).not.toContain('opp-badminton-cup-2026');
      expect(matchedIds).toContain('opp-cultural-fest-2026');
      expect(matchedIds).not.toContain('opp-cricket-football-tournament-2026');
    });
  });

  describe('Broad vs Specific Interest Matching Rules', () => {
    const sportsOpp1: Opportunity = {
      id: 'opp-badminton',
      title: 'Badminton Doubles Cup',
      category: 'Sports',
      description: 'Badminton tournament',
      interestTags: ['Sports', 'badminton'],
      subcategoryTags: ['badminton'],
      venue: 'Gym',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      isActive: true,
      createdAt: '2026-10-01',
    };

    const sportsOpp2: Opportunity = {
      id: 'opp-cricket',
      title: 'Cricket Knockout Championship',
      category: 'Sports',
      description: 'Cricket tournament',
      interestTags: ['Sports', 'cricket'],
      subcategoryTags: ['cricket'],
      venue: 'Stadium',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      isActive: true,
      createdAt: '2026-10-01',
    };

    it('matches all sports subcategories when broad "Sports" category is selected', () => {
      const broadSportsInterests: StudentInterests = {
        categories: ['Sports'],
        subcategories: [],
      };

      const results = matchOpportunities(testStudent, broadSportsInterests, [sportsOpp1, sportsOpp2]);
      const matchedIds = results.map((r) => r.opportunity.id);

      expect(matchedIds).toContain('opp-badminton');
      expect(matchedIds).toContain('opp-cricket');
    });

    it('matches ONLY badminton when specific "badminton" is selected without broad "Sports"', () => {
      const specificBadmintonInterests: StudentInterests = {
        categories: [],
        subcategories: ['badminton'],
      };

      const results = matchOpportunities(testStudent, specificBadmintonInterests, [sportsOpp1, sportsOpp2]);
      const matchedIds = results.map((r) => r.opportunity.id);

      expect(matchedIds).toContain('opp-badminton');
      expect(matchedIds).not.toContain('opp-cricket'); // Must NOT match unrelated cricket
    });
  });

  describe('Scholarship Eligibility & Topic Rules', () => {
    const aiScholarship: Opportunity = {
      id: 'opp-ai-scholarship',
      title: 'Endowment Merit Scholarship in Artificial Intelligence',
      category: 'Scholarships',
      description: 'Academic grant for students pursuing AI innovation',
      interestTags: ['Coding and technology', 'AI and machine learning'],
      subcategoryTags: ['AI and machine learning'],
      venue: 'Admin Office',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['AIML'],
      eligibleYears: [3],
      scholarshipDetails: {
        awardAmount: '₹50,000',
        minimumMarksPercentage: 75,
      },
      isActive: true,
      createdAt: '2026-10-01',
    };

    it('recommends scholarship when student has matching interest AND meets marks criteria', () => {
      const codingInterests: StudentInterests = {
        categories: ['Coding and technology'],
        subcategories: ['AI and machine learning'],
      };

      // Student has 80% marks (>= 75%)
      const results = matchOpportunities(testStudent, codingInterests, [aiScholarship], 80);
      expect(results.map((r) => r.opportunity.id)).toContain('opp-ai-scholarship');
    });

    it('does NOT recommend scholarship when marks are below requirement even if interest matches', () => {
      const codingInterests: StudentInterests = {
        categories: ['Coding and technology'],
        subcategories: ['AI and machine learning'],
      };

      // Student has 68% marks (< 75%)
      const results = matchOpportunities(testStudent, codingInterests, [aiScholarship], 68);
      expect(results.map((r) => r.opportunity.id)).not.toContain('opp-ai-scholarship');
    });

    it('does NOT recommend scholarship if topic does NOT match even if marks qualify', () => {
      const culturalInterests: StudentInterests = {
        categories: ['Cultural and arts activities'],
        subcategories: ['music'],
      };

      // Student has 90% marks, but topic does not match
      const results = matchOpportunities(testStudent, culturalInterests, [aiScholarship], 90);
      expect(results.map((r) => r.opportunity.id)).not.toContain('opp-ai-scholarship');
    });
  });

  describe('Empty State & General Gate Rules', () => {
    it('returns empty list when student has no saved interests (does not fall back to all)', () => {
      const emptyInterests: StudentInterests = {
        categories: [],
        subcategories: [],
        customInterests: [],
      };

      const resultsWithEmpty = matchOpportunities(testStudent, emptyInterests, INITIAL_OPPORTUNITIES as Opportunity[]);
      expect(resultsWithEmpty).toHaveLength(0);

      const resultsWithNull = matchOpportunities(testStudent, null, INITIAL_OPPORTUNITIES as Opportunity[]);
      expect(resultsWithNull).toHaveLength(0);
    });

    it('does NOT include "Scholarships" in whyThisMatches explanations', () => {
      const codingInterests: StudentInterests = {
        categories: ['Coding and technology'],
        subcategories: ['AI and machine learning'],
      };

      const results = matchOpportunities(testStudent, codingInterests, INITIAL_OPPORTUNITIES as Opportunity[], 85);
      results.forEach((match) => {
        match.matchReasons.forEach((reason) => {
          expect(reason.toLowerCase()).not.toContain('interest category in scholarships');
        });
      });
    });

    it('filters out expired opportunities and inactive opportunities', () => {
      const expiredOpp: Opportunity = {
        id: 'opp-expired',
        title: 'Past Event',
        category: 'Sports',
        description: 'Past event',
        interestTags: ['Sports'],
        subcategoryTags: ['football'],
        venue: 'Stadium',
        city: 'Bengaluru',
        eventDate: pastDate,
        registrationDeadline: pastDate,
        isActive: true,
        createdAt: '2026-09-01',
      };

      const inactiveOpp: Opportunity = {
        id: 'opp-inactive',
        title: 'Future Inactive Event',
        category: 'Sports',
        description: 'Inactive event',
        interestTags: ['Sports'],
        subcategoryTags: ['football'],
        venue: 'Stadium',
        city: 'Bengaluru',
        eventDate: futureDate,
        registrationDeadline: futureDate,
        isActive: false,
        createdAt: '2026-10-01',
      };

      const sportsInterests: StudentInterests = {
        categories: ['Sports'],
        subcategories: ['football'],
      };

      const results = matchOpportunities(testStudent, sportsInterests, [expiredOpp, inactiveOpp]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Sample Students Integrity', () => {
    it('verifies all 30 sample students have valid categories without Scholarships as an interest category', async () => {
      const { DEMO_STUDENTS } = await import('../server/seedData.js');
      expect(DEMO_STUDENTS).toHaveLength(30);

      DEMO_STUDENTS.forEach((student) => {
        expect(student.interests).toBeDefined();
        // Scholarships must not be assigned as a student interest category
        expect(student.interests?.categories).not.toContain('Scholarships');
      });
    });
  });
});
