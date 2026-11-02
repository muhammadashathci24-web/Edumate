import { Opportunity, Student, StudentInterests, RecommendationMatch } from './types';

/**
 * Normalizes text for case-insensitive matching.
 */
function normalize(str: string): string {
  return (str || '').toLowerCase().trim();
}

/**
 * Calculates days remaining until a given date string (YYYY-MM-DD or ISO).
 */
export function getDaysRemaining(targetDateStr: string): number {
  if (!targetDateStr) return 999;
  const targetDate = new Date(targetDateStr);
  if (isNaN(targetDate.getTime())) return 999;

  const now = new Date();
  // Strip time for clean day diff
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks whether an opportunity's registration deadline or event date has passed.
 */
export function isOpportunityExpired(opportunity: Opportunity): boolean {
  const deadlineDays = getDaysRemaining(opportunity.registrationDeadline);
  const eventDays = getDaysRemaining(opportunity.eventDate);

  // If registration deadline exists and is in the past (< 0), it's expired
  if (opportunity.registrationDeadline && deadlineDays < 0) {
    return true;
  }
  // If event date exists and is in the past, it's expired
  if (opportunity.eventDate && eventDays < 0) {
    return true;
  }
  return false;
}

/**
 * Checks whether a student meets the academic and departmental eligibility criteria.
 */
export function checkAcademicEligibility(
  opportunity: Opportunity,
  student: Student,
  averageMarksPercentage?: number | null
): { isEligible: boolean; reason?: string } {
  // Department filter
  if (
    opportunity.eligibleDepartments &&
    opportunity.eligibleDepartments.length > 0 &&
    !opportunity.eligibleDepartments.includes('ALL') &&
    !opportunity.eligibleDepartments.some((d) => normalize(d) === normalize(student.department))
  ) {
    return {
      isEligible: false,
      reason: `Open only to departments: ${opportunity.eligibleDepartments.join(', ')}`,
    };
  }

  // Year filter
  if (
    opportunity.eligibleYears &&
    opportunity.eligibleYears.length > 0 &&
    !opportunity.eligibleYears.includes(student.year)
  ) {
    return {
      isEligible: false,
      reason: `Open only to Year ${opportunity.eligibleYears.join(', ')}`,
    };
  }

  // Section filter
  if (
    opportunity.eligibleSections &&
    opportunity.eligibleSections.length > 0 &&
    !opportunity.eligibleSections.includes('ALL') &&
    !opportunity.eligibleSections.some((s) => normalize(s) === normalize(student.section))
  ) {
    return {
      isEligible: false,
      reason: `Open only to Section ${opportunity.eligibleSections.join(', ')}`,
    };
  }

  // Scholarship minimum marks filter
  if (
    opportunity.category === 'Scholarships' &&
    opportunity.scholarshipDetails?.minimumMarksPercentage
  ) {
    const requiredMin = opportunity.scholarshipDetails.minimumMarksPercentage;
    if (averageMarksPercentage !== null && averageMarksPercentage !== undefined) {
      if (averageMarksPercentage < requiredMin) {
        return {
          isEligible: false,
          reason: `Requires minimum ${requiredMin}% aggregate marks (current: ${averageMarksPercentage}%)`,
        };
      }
    }
  }

  return { isEligible: true };
}

/**
 * Transparent, content-based recommendation engine.
 * Matches student interests, subcategories, location, and eligibility
 * to produce ranked opportunities with explainable reasons.
 */
export function matchOpportunities(
  student: Student,
  interests: StudentInterests | null,
  opportunities: Opportunity[],
  averageMarksPercentage?: number | null
): RecommendationMatch[] {
  const matches: RecommendationMatch[] = [];

  const studentCategories = (interests?.categories || []).map(normalize);
  const studentSubcategories = (interests?.subcategories || []).map(normalize);
  const studentCustom = (interests?.customInterests || []).map(normalize);
  const studentCity = normalize(interests?.preferredCity || '');

  const hasInterestsConfigured =
    studentCategories.length > 0 ||
    studentSubcategories.length > 0 ||
    studentCustom.length > 0;

  for (const opp of opportunities) {
    // 1. Exclude inactive opportunities
    if (!opp.isActive) continue;

    // 2. Exclude opportunities with passed deadlines or event dates
    if (isOpportunityExpired(opp)) continue;

    // 3. Apply academic eligibility rules
    const eligibility = checkAcademicEligibility(opp, student, averageMarksPercentage);
    if (!eligibility.isEligible) continue;

    // 4. Content-based Interest Matching
    let score = 0;
    const matchReasons: string[] = [];
    const matchedInterests: string[] = [];

    const oppCategoryNorm = normalize(opp.category);
    const oppInterestTagsNorm = (opp.interestTags || []).map(normalize);
    const oppSubcategoryTagsNorm = (opp.subcategoryTags || []).map(normalize);

    // Category match
    const categoryMatched = studentCategories.some(
      (cat) => cat === oppCategoryNorm || oppInterestTagsNorm.includes(cat)
    );
    if (categoryMatched) {
      score += 15;
      matchReasons.push(`Matches your interest category in ${opp.category}`);
      matchedInterests.push(opp.category);
    }

    // Subcategory matches
    for (const sub of studentSubcategories) {
      if (sub === 'other') continue;
      if (
        oppSubcategoryTagsNorm.includes(sub) ||
        oppInterestTagsNorm.includes(sub) ||
        normalize(opp.title).includes(sub) ||
        normalize(opp.description).includes(sub)
      ) {
        score += 10;
        if (!matchedInterests.includes(sub)) {
          matchedInterests.push(sub);
        }
      }
    }

    // Custom interests matches
    for (const custom of studentCustom) {
      if (
        oppSubcategoryTagsNorm.includes(custom) ||
        oppInterestTagsNorm.includes(custom) ||
        normalize(opp.title).includes(custom) ||
        normalize(opp.description).includes(custom)
      ) {
        score += 10;
        if (!matchedInterests.includes(custom)) {
          matchedInterests.push(custom);
        }
      }
    }

    if (matchedInterests.length > 0) {
      const topMatched = matchedInterests.slice(0, 3).join(', ');
      if (!categoryMatched) {
        matchReasons.push(`Matches your topics: ${topMatched}`);
      } else if (matchedInterests.length > 1) {
        matchReasons.push(`Topics: ${topMatched}`);
      }
    }

    // If student has NOT configured any interests yet, assign a baseline score so they can still browse active campus opportunities
    if (!hasInterestsConfigured) {
      score += 5;
      matchReasons.push('Open opportunity available for all enrolled students');
    }

    // 5. Location factor
    const oppCityNorm = normalize(opp.city || '');
    const oppVenueNorm = normalize(opp.venue || '');
    const isOnline = oppCityNorm.includes('online') || oppCityNorm.includes('virtual') || oppVenueNorm.includes('online');
    const isCampus = oppCityNorm.includes('campus') || oppVenueNorm.includes('campus');
    const isCityMatch = studentCity && (oppCityNorm.includes(studentCity) || studentCity.includes(oppCityNorm));

    const isLocationMatch = Boolean(isCityMatch || isOnline || isCampus);

    if (isCityMatch) {
      score += 12;
      matchReasons.push(`Happening in your preferred city: ${opp.city}`);
    } else if (isCampus) {
      score += 8;
      matchReasons.push(`On-campus opportunity (${opp.venue})`);
    } else if (isOnline) {
      score += 6;
      matchReasons.push('Virtual / Online participation');
    }

    // Academic eligibility tag
    matchReasons.push(`Eligible for ${student.department} Year ${student.year}`);

    // Scholarship criteria mention
    if (opp.category === 'Scholarships' && opp.scholarshipDetails) {
      if (opp.scholarshipDetails.awardAmount) {
        matchReasons.push(`Award: ${opp.scholarshipDetails.awardAmount}`);
      }
      if (opp.scholarshipDetails.minimumMarksPercentage) {
        matchReasons.push(`Merit criteria met: ${opp.scholarshipDetails.minimumMarksPercentage}% requirement`);
      }
    }

    // 6. Urgency bonus: Opportunities closing soon receive a small boost
    const daysRemaining = getDaysRemaining(opp.registrationDeadline || opp.eventDate);
    if (daysRemaining >= 0 && daysRemaining <= 7) {
      score += 5;
      matchReasons.push(`Registration closes soon (${daysRemaining === 0 ? 'Today' : `${daysRemaining} days left`})`);
    } else if (daysRemaining > 7 && daysRemaining <= 21) {
      score += 3;
    }

    // Only include if there is an interest match OR if student hasn't chosen interests yet
    if (score > 0) {
      matches.push({
        opportunity: opp,
        score,
        matchReasons,
        matchedInterests,
        isLocationMatch,
        isEligible: true,
        daysRemaining,
      });
    }
  }

  // 7. Sort by score descending; if score equal, sort by earliest deadline
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.daysRemaining - b.daysRemaining;
  });

  return matches;
}
