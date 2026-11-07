import { describe, it, expect } from 'vitest';
import { matchOpportunities } from '../src/lib/recommendations';
import { Opportunity, Student, StudentInterests } from '../src/lib/types';
import { INITIAL_OPPORTUNITIES } from '../server/seedData.js';

describe('Real-Time Opportunity Recommendations & Strict Dynamic Matching Verification', () => {
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Student 1: Interested in Coding and AI
  const studentCodingAI: Student = {
    usn: '1EM22AI010',
    uid: 'stu-ai3a-010',
    name: 'Charan Raj',
    email: 'charan.raj@example.edu',
    department: 'AIML',
    year: 3,
    section: 'A',
    status: 'active',
  };

  const interestsCodingAI: StudentInterests = {
    categories: ['Coding and technology'],
    subcategories: ['AI and machine learning', 'hackathons'],
    preferredCity: 'Bengaluru',
  };

  // Student 2: Interested in Sports only
  const studentSports: Student = {
    usn: '1EM22AI025',
    uid: 'stu-ai3b-025',
    name: 'Pooja Hegde',
    email: 'pooja.hegde@example.edu',
    department: 'AIML',
    year: 3,
    section: 'B',
    status: 'active',
  };

  const interestsSports: StudentInterests = {
    categories: ['Sports'],
    subcategories: ['badminton'],
    preferredCity: 'Bengaluru',
  };

  it('Case 1, 2, 3: When admin publishes a new event with matching tags, it immediately appears in recommendations', () => {
    // 1. Student initially has existing catalog
    const initialCatalog: Opportunity[] = [...(INITIAL_OPPORTUNITIES as Opportunity[])];
    const initialMatches = matchOpportunities(studentCodingAI, interestsCodingAI, initialCatalog);
    const initialMatchedIds = initialMatches.map((m) => m.opportunity.id);
    expect(initialMatchedIds).not.toContain('opp-new-ai-hackathon-2026');

    // 2. Admin adds and publishes a new event with matching tags
    const newMatchingEvent: Opportunity = {
      id: 'opp-new-ai-hackathon-2026',
      title: 'State Inter-Collegiate Generative AI Hackathon 2026',
      category: 'Coding and technology',
      description: 'Build innovative generative AI models and intelligent agents.',
      interestTags: ['Coding and technology', 'AI and machine learning', 'hackathons'],
      subcategoryTags: ['AI and machine learning', 'hackathons'],
      venue: 'Main Campus Quadrangle',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['AIML', 'CSE'],
      eligibleYears: [3, 4],
      eligibleSections: ['ALL'],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Real-time synchronization updates catalog
    const updatedCatalog = [newMatchingEvent, ...initialCatalog];

    // 3. Confirm it appears in student recommendations with correct TF-IDF ranking
    const updatedMatches = matchOpportunities(studentCodingAI, interestsCodingAI, updatedCatalog);
    const updatedMatchedIds = updatedMatches.map((m) => m.opportunity.id);

    expect(updatedMatchedIds).toContain('opp-new-ai-hackathon-2026');
    const matchedOpp = updatedMatches.find((m) => m.opportunity.id === 'opp-new-ai-hackathon-2026');
    expect(matchedOpp).toBeDefined();
    expect(matchedOpp!.score).toBeGreaterThan(0);
    expect(matchedOpp!.isEligible).toBe(true);
    expect(matchedOpp!.matchReasons.length).toBeGreaterThan(0);
  });

  it('Case 4: Newly added event with unrelated tags does NOT appear for that student', () => {
    // Admin creates an event in Sports with badminton tags
    const unrelatedSportsEvent: Opportunity = {
      id: 'opp-unrelated-badminton-cup',
      title: 'Inter-Collegiate Badminton Doubles Cup',
      category: 'Sports',
      description: 'Annual competitive badminton tournament.',
      interestTags: ['Sports', 'badminton'],
      subcategoryTags: ['badminton'],
      venue: 'Sports Annex',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['ALL'],
      eligibleYears: [1, 2, 3, 4],
      eligibleSections: ['ALL'],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const catalog = [unrelatedSportsEvent, ...(INITIAL_OPPORTUNITIES as Opportunity[])];
    const matches = matchOpportunities(studentCodingAI, interestsCodingAI, catalog);
    const matchedIds = matches.map((m) => m.opportunity.id);

    // Must NOT appear for student whose interests are only Coding & AI
    expect(matchedIds).not.toContain('opp-unrelated-badminton-cup');
  });

  it('Case 5: Deactivating or expiring a matching event immediately removes it from recommendations', () => {
    const activeEvent: Opportunity = {
      id: 'opp-temp-ai-challenge',
      title: 'National Autonomous AI Coding Challenge',
      category: 'Coding and technology',
      description: 'Coding competition for autonomous agents.',
      interestTags: ['Coding and technology', 'AI and machine learning'],
      subcategoryTags: ['AI and machine learning'],
      venue: 'Tech Park',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['ALL'],
      eligibleYears: [3],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // When active and not expired: appears
    const activeMatches = matchOpportunities(studentCodingAI, interestsCodingAI, [activeEvent]);
    expect(activeMatches.map((m) => m.opportunity.id)).toContain('opp-temp-ai-challenge');

    // Admin deactivates it: disappears
    const deactivatedMatches = matchOpportunities(studentCodingAI, interestsCodingAI, [
      { ...activeEvent, isActive: false },
    ]);
    expect(deactivatedMatches.map((m) => m.opportunity.id)).not.toContain('opp-temp-ai-challenge');

    // Registration deadline passes: disappears
    const expiredMatches = matchOpportunities(studentCodingAI, interestsCodingAI, [
      { ...activeEvent, registrationDeadline: pastDate },
    ]);
    expect(expiredMatches.map((m) => m.opportunity.id)).not.toContain('opp-temp-ai-challenge');
  });

  it('Case 6: Different students with different interests receive independently matched results', () => {
    const aiEvent: Opportunity = {
      id: 'opp-independent-ai',
      title: 'NextGen AI & Robotics Symposium',
      category: 'Coding and technology',
      description: 'AI, robotics, and automation exhibition.',
      interestTags: ['Coding and technology', 'AI and machine learning'],
      subcategoryTags: ['AI and machine learning'],
      venue: 'Tech Hall',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const sportsEvent: Opportunity = {
      id: 'opp-independent-sports',
      title: 'Inter-Department Badminton League',
      category: 'Sports',
      description: 'Badminton singles and doubles league.',
      interestTags: ['Sports', 'badminton'],
      subcategoryTags: ['badminton'],
      venue: 'Indoor Stadium',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const combinedCatalog = [aiEvent, sportsEvent];

    // Student 1 (Coding & AI): Matches AI, does not match sports
    const codingMatches = matchOpportunities(studentCodingAI, interestsCodingAI, combinedCatalog);
    const codingIds = codingMatches.map((m) => m.opportunity.id);
    expect(codingIds).toContain('opp-independent-ai');
    expect(codingIds).not.toContain('opp-independent-sports');

    // Student 2 (Sports): Matches sports, does not match AI
    const sportsMatches = matchOpportunities(studentSports, interestsSports, combinedCatalog);
    const sportsIds = sportsMatches.map((m) => m.opportunity.id);
    expect(sportsIds).toContain('opp-independent-sports');
    expect(sportsIds).not.toContain('opp-independent-ai');
  });

  it('Dynamic updates: Recomputes recommendations when event tags, eligibility, or dates change', () => {
    const restrictedEvent: Opportunity = {
      id: 'opp-restricted-dept',
      title: 'Mechanical Design and Robotics Expo',
      category: 'Coding and technology',
      description: 'Hands-on robotics expo.',
      interestTags: ['Coding and technology', 'robotics'],
      subcategoryTags: ['robotics'],
      venue: 'Lab 1',
      city: 'Bengaluru',
      eventDate: futureDate,
      registrationDeadline: futureDate,
      eligibleDepartments: ['MECH'], // Only MECH
      eligibleYears: [3],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const roboticsInterests: StudentInterests = {
      categories: ['Coding and technology'],
      subcategories: ['robotics'],
    };

    // Initially AIML student is filtered out by eligibility gate
    const initial = matchOpportunities(studentCodingAI, roboticsInterests, [restrictedEvent]);
    expect(initial.map((m) => m.opportunity.id)).not.toContain('opp-restricted-dept');

    // Admin updates eligibility to include AIML
    const updated = matchOpportunities(studentCodingAI, roboticsInterests, [
      { ...restrictedEvent, eligibleDepartments: ['AIML', 'MECH'] },
    ]);
    expect(updated.map((m) => m.opportunity.id)).toContain('opp-restricted-dept');
  });
});
