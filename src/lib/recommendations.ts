import { Opportunity, Student, StudentInterests, RecommendationMatch } from './types';
import { INTEREST_CATEGORIES } from './interestConstants';

/**
 * Minimum cosine similarity threshold required for an opportunity to be recommended.
 * An opportunity is gated out if its TF-IDF vector similarity with student interests is below 0.05 (5%).
 */
export const COSINE_SIMILARITY_THRESHOLD = 0.05;

/**
 * Generic words that MUST NEVER count as an interest match.
 * Includes common English stop words, college domain administrative terms, and opportunity type identifiers.
 */
export const STOP_WORDS = new Set<string>([
  // Common English stop words
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'won', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves',

  // Administrative, location, event boilerplate, and opportunity types barred from matching
  'student', 'students', 'event', 'events', 'opportunity', 'opportunities',
  'scholarship', 'scholarships', 'college', 'campus', 'university', 'annual',
  'participate', 'participation', 'registered', 'registration', 'register',
  'apply', 'application', 'open', 'eligible', 'eligibility', 'department',
  'year', 'section', 'details', 'winner', 'cash', 'prize', 'prizes', 'award',
  'awards', 'venue', 'date', 'dates', 'time', 'link', 'meet', 'annex', 'hall',
  'block', 'bengaluru', 'bangalore', 'mangaluru', 'mysuru', 'hubballi', 'online',
  'virtual', 'per', 'term', 'month', 'grant', 'endowment', 'office', 'centre',
  'center', 'dr', 'mr', 'ms', 'mrs', 'prof', 'aiml', 'cse', 'ise', 'ece',
  'first', 'second', 'third', 'fourth', 'fifth', 'hour', 'hours', 'day', 'days',
]);

/**
 * Normalizes text for case-insensitive matching and strips punctuation.
 */
function normalize(str: string): string {
  return (str || '').toLowerCase().trim();
}

/**
 * Tokenizes text into normalized word tokens and compound bi-grams.
 * Excludes generic stop words and single-character tokens.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];

  // Replace punctuation and non-alphanumeric characters with spaces
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ');

  const words = clean
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const tokens: string[] = [...words];

  // Also include bigrams for multi-word domain concepts (e.g. "machine_learning", "paper_presentations")
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`);
  }

  return tokens;
}

/**
 * Calculates days remaining until a given date string (YYYY-MM-DD or ISO).
 */
export function getDaysRemaining(targetDateStr: string): number {
  if (!targetDateStr) return 999;
  const targetDate = new Date(targetDateStr);
  if (isNaN(targetDate.getTime())) return 999;

  const now = new Date();
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

  if (opportunity.registrationDeadline && deadlineDays < 0) {
    return true;
  }
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
 * Builds the student interest tokens strictly from explicitly saved profile interests.
 * Supports broad category expansion (e.g. broad "Sports" expands to sports subcategories,
 * whereas specific "Badminton" matches only badminton opportunities unless broad "Sports" is selected).
 */
export function buildStudentInterestProfile(interests: StudentInterests | null): {
  tokens: string[];
  selectedCategories: string[];
  selectedSubcategories: string[];
  customInterests: string[];
  hasInterests: boolean;
} {
  if (!interests) {
    return {
      tokens: [],
      selectedCategories: [],
      selectedSubcategories: [],
      customInterests: [],
      hasInterests: false,
    };
  }

  const selectedCategories = (interests.categories || []).filter(
    (c) => c && c.toLowerCase() !== 'other' && c.toLowerCase() !== 'scholarships'
  );
  const selectedSubcategories = (interests.subcategories || []).filter(
    (s) => s && s.toLowerCase() !== 'other'
  );
  const customInterests = (interests.customInterests || []).filter(Boolean);

  const hasInterests =
    selectedCategories.length > 0 ||
    selectedSubcategories.length > 0 ||
    customInterests.length > 0;

  if (!hasInterests) {
    return {
      tokens: [],
      selectedCategories: [],
      selectedSubcategories: [],
      customInterests: [],
      hasInterests: false,
    };
  }

  const parts: string[] = [];

  // 1. Selected broad categories: include category name and expand its subcategories
  for (const cat of selectedCategories) {
    parts.push(cat);
    const categoryConfig = INTEREST_CATEGORIES.find(
      (c) => c.id.toLowerCase() === cat.toLowerCase()
    );
    if (categoryConfig) {
      for (const sub of categoryConfig.subcategories) {
        if (sub.toLowerCase() !== 'other') {
          parts.push(sub);
        }
      }
    }
  }

  // 2. Selected subcategories
  for (const sub of selectedSubcategories) {
    parts.push(sub);
  }

  // 3. Custom interests
  for (const custom of customInterests) {
    parts.push(custom);
  }

  const tokens = tokenizeText(parts.join(' '));

  return {
    tokens,
    selectedCategories,
    selectedSubcategories,
    customInterests,
    hasInterests: tokens.length > 0,
  };
}

/**
 * Builds opportunity text tokens from title, tags, subcategory tags, and relevant description.
 * Explicitly strips opportunity type 'Scholarships' from interest tags to prevent false matches.
 */
export function buildOpportunityTokens(opp: Opportunity): {
  tokens: string[];
  interestTags: string[];
  subcategoryTags: string[];
} {
  const parts: string[] = [];

  // Title
  parts.push(opp.title);

  // Filter out 'Scholarships' from interest tags — scholarships are an opportunity type, not an interest
  const interestTags = (opp.interestTags || []).filter(
    (t) => t && t.toLowerCase() !== 'scholarships' && t.toLowerCase() !== 'scholarship'
  );
  for (const tag of interestTags) {
    parts.push(tag);
  }

  // Subcategory tags
  const subcategoryTags = (opp.subcategoryTags || []).filter(
    (t) => t && t.toLowerCase() !== 'other'
  );
  for (const sub of subcategoryTags) {
    parts.push(sub);
  }

  // Description
  parts.push(opp.description || '');

  // Include category name ONLY if not Scholarships
  if (opp.category !== 'Scholarships') {
    parts.push(opp.category);
  }

  const tokens = tokenizeText(parts.join(' '));

  return {
    tokens,
    interestTags,
    subcategoryTags,
  };
}

/**
 * Vector representation for TF-IDF calculations.
 */
export interface DocumentVector {
  tf: Map<string, number>;
  tfidf: Map<string, number>;
  norm: number;
}

/**
 * Computes TF-IDF vectors for a corpus consisting of the student profile and all opportunities.
 */
export function computeTfIdfVectors(
  studentTokens: string[],
  opportunitiesWithTokens: Array<{ id: string; tokens: string[] }>
): {
  studentVector: DocumentVector;
  opportunityVectors: Map<string, DocumentVector>;
} {
  const corpus = [
    { id: '__student__', tokens: studentTokens },
    ...opportunitiesWithTokens,
  ];
  const numDocs = corpus.length;

  // 1. Calculate Document Frequency (DF) for each unique token in the corpus
  const df = new Map<string, number>();
  for (const doc of corpus) {
    const uniqueTerms = new Set(doc.tokens);
    for (const term of uniqueTerms) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  // 2. Calculate Smooth Inverse Document Frequency (IDF)
  // IDF(t) = ln((1 + N) / (1 + DF(t))) + 1
  const idf = new Map<string, number>();
  for (const [term, freq] of df.entries()) {
    idf.set(term, Math.log((1 + numDocs) / (1 + freq)) + 1);
  }

  // 3. Compute TF and TF-IDF for each document
  const vectors = new Map<string, DocumentVector>();

  for (const doc of corpus) {
    const termCount = new Map<string, number>();
    for (const term of doc.tokens) {
      termCount.set(term, (termCount.get(term) || 0) + 1);
    }

    const totalTokens = doc.tokens.length || 1;
    const tf = new Map<string, number>();
    const tfidf = new Map<string, number>();
    let sumSquares = 0;

    for (const [term, count] of termCount.entries()) {
      const termTf = count / totalTokens;
      const termIdf = idf.get(term) || 1;
      const weight = termTf * termIdf;

      tf.set(term, termTf);
      tfidf.set(term, weight);
      sumSquares += weight * weight;
    }

    const norm = Math.sqrt(sumSquares);
    vectors.set(doc.id, { tf, tfidf, norm });
  }

  return {
    studentVector: vectors.get('__student__')!,
    opportunityVectors: vectors,
  };
}

/**
 * Calculates Cosine Similarity between two TF-IDF document vectors.
 * Returns a value between 0.0 and 1.0.
 */
export function computeCosineSimilarity(
  vecA: DocumentVector,
  vecB: DocumentVector
): number {
  if (!vecA || !vecB || vecA.norm === 0 || vecB.norm === 0) {
    return 0;
  }

  let dotProduct = 0;
  for (const [term, weightA] of vecA.tfidf.entries()) {
    const weightB = vecB.tfidf.get(term);
    if (weightB !== undefined) {
      dotProduct += weightA * weightB;
    }
  }

  return dotProduct / (vecA.norm * vecB.norm);
}

/**
 * Strict Interest Gate: Verifies that an opportunity has a genuine match to at least
 * one explicitly selected interest, sub-interest, or custom interest.
 */
export function evaluateGenuineInterestMatch(
  studentProfile: ReturnType<typeof buildStudentInterestProfile>,
  opp: Opportunity
): {
  hasGenuineMatch: boolean;
  matchedInterests: string[];
  matchReasons: string[];
} {
  const { selectedCategories, selectedSubcategories, customInterests } = studentProfile;

  const matchedInterests: string[] = [];
  const matchReasons: string[] = [];

  const oppInterestTagsNorm = (opp.interestTags || []).map(normalize);
  const oppSubcategoryTagsNorm = (opp.subcategoryTags || []).map(normalize);
  const oppTitleNorm = normalize(opp.title);

  // 1. Direct Category Match
  for (const cat of selectedCategories) {
    const catNorm = normalize(cat);
    // Exclude Scholarships as a category interest match
    if (catNorm === 'scholarships') continue;

    if (
      normalize(opp.category) === catNorm ||
      oppInterestTagsNorm.includes(catNorm)
    ) {
      if (!matchedInterests.includes(cat)) {
        matchedInterests.push(cat);
      }
      matchReasons.push(`Matches your interest area in ${cat}`);
    }
  }

  // 2. Broad Category Expansion Match (e.g. selected "Sports" matches badminton, cricket, etc.)
  for (const cat of selectedCategories) {
    const config = INTEREST_CATEGORIES.find((c) => normalize(c.id) === normalize(cat));
    if (config) {
      for (const sub of config.subcategories) {
        if (sub.toLowerCase() === 'other') continue;
        const subNorm = normalize(sub);
        if (
          oppSubcategoryTagsNorm.includes(subNorm) ||
          oppInterestTagsNorm.includes(subNorm)
        ) {
          if (!matchedInterests.includes(sub)) {
            matchedInterests.push(sub);
          }
          if (!matchReasons.some((r) => r.includes(cat))) {
            matchReasons.push(`Matches your broad interest in ${cat} (${sub})`);
          }
        }
      }
    }
  }

  // 3. Explicit Subcategory Match (specific subcategory selected by student)
  for (const sub of selectedSubcategories) {
    const subNorm = normalize(sub);
    if (
      oppSubcategoryTagsNorm.includes(subNorm) ||
      oppInterestTagsNorm.includes(subNorm) ||
      oppTitleNorm.includes(subNorm)
    ) {
      if (!matchedInterests.includes(sub)) {
        matchedInterests.push(sub);
      }
      matchReasons.push(`Matches your saved sub-interest: ${sub}`);
    }
  }

  // 4. Custom Interest Match
  for (const custom of customInterests) {
    const customNorm = normalize(custom);
    if (
      oppSubcategoryTagsNorm.includes(customNorm) ||
      oppInterestTagsNorm.includes(customNorm) ||
      oppTitleNorm.includes(customNorm) ||
      normalize(opp.description).includes(customNorm)
    ) {
      if (!matchedInterests.includes(custom)) {
        matchedInterests.push(custom);
      }
      matchReasons.push(`Matches your custom interest: ${custom}`);
    }
  }

  // Deduplicate match reasons
  const uniqueReasons = Array.from(new Set(matchReasons));

  return {
    hasGenuineMatch: matchedInterests.length > 0,
    matchedInterests,
    matchReasons: uniqueReasons,
  };
}

/**
 * Transparent, TF-IDF content-based recommendation engine for EduMate.
 *
 * Rules:
 * 1. Only recommends opportunities matching the student's explicitly saved interests.
 * 2. Employs TF-IDF vectorization and Cosine Similarity with a strict threshold (0.05).
 * 3. Enforces strict eligibility gate (genuine interest match + academic/scholarship eligibility).
 * 4. Generic words ("student", "event", "opportunity", "scholarship") NEVER trigger a match.
 * 5. Scholarships must match student's interest topic AND meet scholarship eligibility rules.
 * 6. Students with no saved interests receive an empty recommendation list (never every opportunity).
 * 7. Location and eligibility are reported separately, not as interest match reasons.
 */
export function matchOpportunities(
  student: Student,
  interests: StudentInterests | null,
  opportunities: Opportunity[],
  averageMarksPercentage?: number | null
): RecommendationMatch[] {
  // If student has no interests configured, recommend nothing (strict empty state)
  const studentProfile = buildStudentInterestProfile(interests);
  if (!studentProfile.hasInterests || studentProfile.tokens.length === 0) {
    return [];
  }

  // 1. Build tokens for all opportunities
  const opportunitiesWithTokens = opportunities.map((opp) => ({
    id: opp.id,
    opp,
    ...buildOpportunityTokens(opp),
  }));

  // 2. Compute TF-IDF vectors for student profile and all opportunities
  const { studentVector, opportunityVectors } = computeTfIdfVectors(
    studentProfile.tokens,
    opportunitiesWithTokens.map((o) => ({ id: o.id, tokens: o.tokens }))
  );

  const studentCity = normalize(interests?.preferredCity || '');
  const matches: RecommendationMatch[] = [];

  for (const { id, opp } of opportunitiesWithTokens) {
    // 3. Exclude inactive opportunities
    if (!opp.isActive) continue;

    // 4. Exclude expired opportunities (past registration deadline or past event date)
    if (isOpportunityExpired(opp)) continue;

    // 5. Apply academic and scholarship eligibility gate
    const eligibility = checkAcademicEligibility(opp, student, averageMarksPercentage);
    if (!eligibility.isEligible) continue;

    // 6. Strict Interest Gate: Opportunity must have a genuine match to at least one interest
    const interestGate = evaluateGenuineInterestMatch(studentProfile, opp);
    if (!interestGate.hasGenuineMatch) {
      continue;
    }

    // 7. Calculate Cosine Similarity
    const oppVector = opportunityVectors.get(id);
    if (!oppVector) continue;

    const cosineSimilarity = computeCosineSimilarity(studentVector, oppVector);

    // Apply documented threshold gate: similarity must be >= COSINE_SIMILARITY_THRESHOLD
    if (cosineSimilarity < COSINE_SIMILARITY_THRESHOLD) {
      continue;
    }

    // Normalized score scaled 0 - 100
    const score = Math.round(cosineSimilarity * 100);

    // Separate Location Details
    const oppCityNorm = normalize(opp.city || '');
    const oppVenueNorm = normalize(opp.venue || '');
    const isOnline = oppCityNorm.includes('online') || oppCityNorm.includes('virtual') || oppVenueNorm.includes('online');
    const isCampus = oppCityNorm.includes('campus') || oppVenueNorm.includes('campus');
    const isCityMatch = studentCity && (oppCityNorm.includes(studentCity) || studentCity.includes(oppCityNorm));
    const isLocationMatch = Boolean(isCityMatch || isOnline || isCampus);

    let locationDetail = `${opp.venue}, ${opp.city}`;
    if (isCityMatch) {
      locationDetail = `Happening in your preferred city: ${opp.city} (${opp.venue})`;
    } else if (isCampus) {
      locationDetail = `On-campus venue: ${opp.venue}`;
    } else if (isOnline) {
      locationDetail = 'Virtual / Online participation';
    }

    // Separate Eligibility Details
    const eligibilityDetail = `Eligible for ${student.department} Year ${student.year} (Section ${student.section})`;
    let scholarshipEligibilityDetail: string | undefined = undefined;

    if (opp.category === 'Scholarships' && opp.scholarshipDetails) {
      const minMarks = opp.scholarshipDetails.minimumMarksPercentage;
      const currentAvg = averageMarksPercentage !== null && averageMarksPercentage !== undefined ? `${averageMarksPercentage}%` : 'N/A';
      scholarshipEligibilityDetail = `Academic merit criteria met: Minimum ${minMarks}% aggregate required (Your average: ${currentAvg})`;
    }

    const daysRemaining = getDaysRemaining(opp.registrationDeadline || opp.eventDate);

    matches.push({
      opportunity: opp,
      score,
      similarityScore: Number(cosineSimilarity.toFixed(4)),
      matchReasons: interestGate.matchReasons,
      matchedInterests: interestGate.matchedInterests,
      eligibilityDetail,
      scholarshipEligibilityDetail,
      locationDetail,
      isLocationMatch,
      isEligible: true,
      daysRemaining,
    });
  }

  // 8. Rank matches by similarity score descending; secondary sort by registration urgency
  matches.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    return a.daysRemaining - b.daysRemaining;
  });

  return matches;
}
