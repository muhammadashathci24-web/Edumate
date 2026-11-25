/**
 * Attendance Threshold Calculation & Simple Linear Regression Trend Analysis
 *
 * Implements strictly:
 * 1. Exact threshold calculation: max(0, floor((A / R) - H)) with exact
 *    floating-point-safe boundary verification.
 * 2. Simple least-squares linear regression on weekly attendance percentages
 *    (added in the regression extension).
 */

export type ThresholdStatus =
  | 'insufficient_data'
  | 'below_threshold'
  | 'at_limit'
  | 'safe';

export interface AttendanceThresholdResult {
  attended: number;
  held: number;
  requiredPercentage: number;
  requiredDecimal: number;
  currentPercentage: number | null;
  safeAbsences: number | null;
  isBelowRequirement: boolean;
  status: ThresholdStatus;
  explanation: string;
}

export interface RequirementValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a configured attendance requirement percentage is strictly
 * greater than 0 and at most 100.
 */
export function validateAttendanceRequirement(
  requiredPercentage: number
): RequirementValidationResult {
  if (
    typeof requiredPercentage !== 'number' ||
    !Number.isFinite(requiredPercentage)
  ) {
    return {
      valid: false,
      error: 'Attendance requirement must be a valid number.',
    };
  }
  if (requiredPercentage <= 0 || requiredPercentage > 100) {
    return {
      valid: false,
      error:
        'Attendance requirement must be greater than 0% and no more than 100%.',
    };
  }
  return { valid: true };
}

/**
 * Formats a percentage value cleanly without misleadingly rounding e.g. 74.9% up to 75%.
 */
export function formatAttendancePercentage(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(2).replace(/\.?0+$/, '')}%`;
}

/**
 * Parses a positive finite decimal number into exact scaled BigInt integers
 * (numerator / 10^scaleDigits) so threshold boundary checks are immune to
 * IEEE-754 floating-point rounding errors.
 */
function toExactScaledPercentage(requiredPercentage: number): {
  scaledRequired: bigint;
  scaleFactor: bigint;
} {
  const raw = requiredPercentage.toString().toLowerCase();
  let mantissa = raw;
  let exponent = 0;

  if (raw.includes('e')) {
    const [m, expStr] = raw.split('e');
    mantissa = m;
    exponent = Number.parseInt(expStr, 10);
  }

  const dotIndex = mantissa.indexOf('.');
  const fracDigits = dotIndex === -1 ? 0 : mantissa.length - dotIndex - 1;
  const digitsOnly = mantissa.replace('.', '');
  const netShift = exponent - fracDigits;

  if (netShift >= 0) {
    return {
      scaledRequired: BigInt(digitsOnly) * 10n ** BigInt(netShift),
      scaleFactor: 1n,
    };
  }

  return {
    scaledRequired: BigInt(digitsOnly),
    scaleFactor: 10n ** BigInt(-netShift),
  };
}

/**
 * Calculates the exact number of additional consecutive classes a student can
 * miss while staying at or above the required attendance percentage.
 *
 * Formula:
 * - Current attendance % = 100 * A / H
 * - Safe future absences = max(0, floor((A / R) - H))
 *
 * Floating-point boundary errors are prevented by verifying candidate counts
 * with exact scaled integer cross-multiplication:
 *   100 * A >= requiredPercentage * (H + m)
 */
export function calculateAttendanceThreshold(
  attended: number,
  held: number,
  requiredPercentage: number
): AttendanceThresholdResult {
  const validation = validateAttendanceRequirement(requiredPercentage);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (
    typeof attended !== 'number' ||
    typeof held !== 'number' ||
    !Number.isInteger(attended) ||
    !Number.isInteger(held) ||
    attended < 0 ||
    held < 0 ||
    attended > held
  ) {
    throw new Error(
      'Attended and held class counts must be non-negative integers with attended <= held.'
    );
  }

  const requiredDecimal = requiredPercentage / 100;
  const reqLabel = formatAttendancePercentage(requiredPercentage);

  if (held === 0) {
    return {
      attended,
      held,
      requiredPercentage,
      requiredDecimal,
      currentPercentage: null,
      safeAbsences: null,
      isBelowRequirement: false,
      status: 'insufficient_data',
      explanation: `Not enough attendance data yet (0 of 0 classes held). Required: ${reqLabel}.`,
    };
  }

  const currentPercentage = (100 * attended) / held;
  const { scaledRequired, scaleFactor } = toExactScaledPercentage(requiredPercentage);

  const meetsRequirementForTotal = (totalClasses: number): boolean => {
    const lhs = 100n * scaleFactor * BigInt(attended);
    const rhs = scaledRequired * BigInt(totalClasses);
    return lhs >= rhs;
  };

  const currentlyMeets = meetsRequirementForTotal(held);
  const currLabel = formatAttendancePercentage(currentPercentage);

  if (!currentlyMeets) {
    return {
      attended,
      held,
      requiredPercentage,
      requiredDecimal,
      currentPercentage,
      safeAbsences: 0,
      isBelowRequirement: true,
      status: 'below_threshold',
      explanation: `Attendance: ${attended} of ${held} classes (${currLabel}). Required: ${reqLabel}. You are already below the threshold and have zero additional absences available.`,
    };
  }

  // Exact 100% requirement never allows future absences even when attendance is perfect
  if (requiredPercentage === 100) {
    return {
      attended,
      held,
      requiredPercentage,
      requiredDecimal: 1,
      currentPercentage,
      safeAbsences: 0,
      isBelowRequirement: false,
      status: 'at_limit',
      explanation: `Attendance: ${attended} of ${held} classes (${currLabel}). Required: 100%. No future absences are safe because a 100% requirement allows zero additional absences.`,
    };
  }

  let safeAbsences = Math.max(0, Math.floor(attended / requiredDecimal - held));

  // Eliminate any floating-point rounding error at exact integer boundaries
  while (safeAbsences > 0 && !meetsRequirementForTotal(held + safeAbsences)) {
    safeAbsences -= 1;
  }
  while (meetsRequirementForTotal(held + safeAbsences + 1)) {
    safeAbsences += 1;
  }

  if (safeAbsences === 0) {
    return {
      attended,
      held,
      requiredPercentage,
      requiredDecimal,
      currentPercentage,
      safeAbsences: 0,
      isBelowRequirement: false,
      status: 'at_limit',
      explanation: `Attendance: ${attended} of ${held} classes (${currLabel}). Required: ${reqLabel}. You have 0 additional absences available; missing the next class would put you below ${reqLabel}.`,
    };
  }

  const classWord = safeAbsences === 1 ? 'class' : 'classes';
  return {
    attended,
    held,
    requiredPercentage,
    requiredDecimal,
    currentPercentage,
    safeAbsences,
    isBelowRequirement: false,
    status: 'safe',
    explanation: `Attendance: ${attended} of ${held} classes (${currLabel}). Required: ${reqLabel}. You can miss up to ${safeAbsences} more ${classWord} before falling below the requirement.`,
  };
}

// ============================================================================
// WEEKLY GROUPING & SIMPLE LEAST-SQUARES LINEAR REGRESSION FORECAST
// ============================================================================

export interface StudentAttendanceSession {
  id: string;
  date: string;
  department: string;
  year: number;
  section: string;
  subject?: string;
  courseCode?: string;
  status: 'present' | 'absent' | 'not recorded';
}

export interface CourseRef {
  code: string;
  title: string;
  department: string;
  year: number;
  sections?: string[];
}

export interface WeeklyAttendancePoint {
  weekNumber: number; // x: chronological week number (1, 2, 3, ...)
  weekStart: string;  // YYYY-MM-DD (Monday of that week in UTC)
  attended: number;
  held: number;
  percentage: number; // y: 100 * attended / held
}

export type RegressionTrendDirection = 'up' | 'down' | 'stable';

export interface AttendanceRegressionResult {
  hasEnoughHistory: boolean;
  weeksCount: number;
  weeklyPoints: WeeklyAttendancePoint[];
  slope: number | null;
  intercept: number | null;
  rawForecastPercentage: number | null;
  forecastNextWeekPercentage: number | null;
  trendDirection: RegressionTrendDirection | null;
  summary: string;
  disclaimer: string;
}

export interface CourseSectionAttendanceAnalysis {
  key: string;
  courseCode: string | null;
  courseTitle: string;
  displayName: string;
  department: string;
  year: number;
  section: string;
  attended: number;
  held: number;
  currentPercentage: number | null;
  threshold: AttendanceThresholdResult | null;
  regression: AttendanceRegressionResult;
}

const REGRESSION_MIN_WEEKS = 3;
const REGRESSION_DISCLAIMER =
  'Estimate only (simple linear regression on weekly attendance) — not an official attendance decision.';

/**
 * Parses a YYYY-MM-DD (or ISO) date string and returns the UTC Monday
 * YYYY-MM-DD string representing that calendar week, or null if invalid.
 */
export function getUtcWeekStart(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMs = Date.UTC(year, month - 1, day);
  const dateObj = new Date(utcMs);

  // Reject impossible calendar dates like 2026-02-30
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month - 1 ||
    dateObj.getUTCDate() !== day
  ) {
    return null;
  }

  const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(Date.UTC(year, month - 1, day + diffToMonday));
  return weekStart.toISOString().slice(0, 10);
}

/**
 * Groups chronological attendance sessions into weekly attendance percentages.
 * Ignores 'not recorded' sessions and invalid dates without fabricating data.
 */
export function groupAttendanceByWeek(
  sessions: ReadonlyArray<Pick<StudentAttendanceSession, 'date' | 'status'>>
): WeeklyAttendancePoint[] {
  const byWeek = new Map<string, { attended: number; held: number }>();

  for (const session of sessions) {
    if (session.status !== 'present' && session.status !== 'absent') {
      continue;
    }
    const weekStart = getUtcWeekStart(session.date);
    if (!weekStart) {
      continue;
    }

    const current = byWeek.get(weekStart) || { attended: 0, held: 0 };
    current.held += 1;
    if (session.status === 'present') {
      current.attended += 1;
    }
    byWeek.set(weekStart, current);
  }

  const sortedWeeks = Array.from(byWeek.keys()).sort((a, b) => a.localeCompare(b));

  return sortedWeeks.map((weekStart, index) => {
    const { attended, held } = byWeek.get(weekStart)!;
    return {
      weekNumber: index + 1,
      weekStart,
      attended,
      held,
      percentage: (100 * attended) / held,
    };
  });
}

/**
 * Performs simple least-squares linear regression on weekly attendance percentages.
 * - Requires at least 3 distinct weeks with attendance data.
 * - Clamps next-week forecast between 0% and 100%.
 * - Serves strictly as a trend estimate and never alters threshold safe absences.
 */
export function computeAttendanceRegressionForecast(
  sessions: ReadonlyArray<Pick<StudentAttendanceSession, 'date' | 'status'>>
): AttendanceRegressionResult {
  const weeklyPoints = groupAttendanceByWeek(sessions);
  const weeksCount = weeklyPoints.length;

  if (weeksCount < REGRESSION_MIN_WEEKS) {
    return {
      hasEnoughHistory: false,
      weeksCount,
      weeklyPoints,
      slope: null,
      intercept: null,
      rawForecastPercentage: null,
      forecastNextWeekPercentage: null,
      trendDirection: null,
      summary: 'More attendance history is needed for a trend forecast',
      disclaimer: REGRESSION_DISCLAIMER,
    };
  }

  let sumX = 0;
  let sumY = 0;
  for (const pt of weeklyPoints) {
    sumX += pt.weekNumber;
    sumY += pt.percentage;
  }

  const xMean = sumX / weeksCount;
  const yMean = sumY / weeksCount;

  let sxx = 0;
  let sxy = 0;
  for (const pt of weeklyPoints) {
    const dx = pt.weekNumber - xMean;
    const dy = pt.percentage - yMean;
    sxx += dx * dx;
    sxy += dx * dy;
  }

  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yMean - slope * xMean;
  const nextWeekX = weeksCount + 1;
  const rawForecastPercentage = slope * nextWeekX + intercept;
  const forecastNextWeekPercentage = Math.min(100, Math.max(0, rawForecastPercentage));

  let trendDirection: RegressionTrendDirection = 'stable';
  let trendLabel = 'Attendance is stable';
  if (slope <= -0.1) {
    trendDirection = 'down';
    trendLabel = 'Attendance is trending down';
  } else if (slope >= 0.1) {
    trendDirection = 'up';
    trendLabel = 'Attendance is trending up';
  }

  const forecastLabel = formatAttendancePercentage(forecastNextWeekPercentage);

  return {
    hasEnoughHistory: true,
    weeksCount,
    weeklyPoints,
    slope,
    intercept,
    rawForecastPercentage,
    forecastNextWeekPercentage,
    trendDirection,
    summary: `${trendLabel} (estimated next week: ${forecastLabel})`,
    disclaimer: REGRESSION_DISCLAIMER,
  };
}

function findMatchingCourse(
  session: StudentAttendanceSession,
  courses: ReadonlyArray<CourseRef>
): CourseRef | null {
  const dept = session.department.trim().toUpperCase();
  const sec = session.section.trim().toUpperCase();
  const sectionCourses = courses.filter(
    (c) =>
      c.department.trim().toUpperCase() === dept &&
      c.year === session.year &&
      (!c.sections || c.sections.map((s) => s.trim().toUpperCase()).includes(sec))
  );

  if (session.courseCode) {
    const codeUpper = session.courseCode.trim().toUpperCase();
    const byCode = sectionCourses.find((c) => c.code.trim().toUpperCase() === codeUpper);
    if (byCode) return byCode;
  }

  const subject = (session.subject || '').trim();
  if (!subject) return null;
  const subjectLower = subject.toLowerCase();

  for (const course of sectionCourses) {
    const codeLower = course.code.trim().toLowerCase();
    const titleLower = course.title.trim().toLowerCase();
    if (
      subjectLower === codeLower ||
      subjectLower === titleLower ||
      subjectLower.startsWith(`${codeLower} `) ||
      subjectLower.startsWith(`${codeLower}-`) ||
      subjectLower.startsWith(`${codeLower}:`)
    ) {
      return course;
    }
  }

  return null;
}

/**
 * Analyzes attendance independently per course and section.
 * Never mixes attendance records across different courses/subjects or sections.
 * When requiredPercentage is null/undefined (not yet configured by an admin),
 * threshold is null so no unconfirmed official rule is silently claimed.
 */
export function analyzeAttendanceByCourseSection(
  sessions: ReadonlyArray<StudentAttendanceSession>,
  enrolledCourses: ReadonlyArray<CourseRef>,
  studentSection: { department: string; year: number; section: string },
  requiredPercentage: number | null | undefined
): CourseSectionAttendanceAnalysis[] {
  if (requiredPercentage !== null && requiredPercentage !== undefined) {
    const validation = validateAttendanceRequirement(requiredPercentage);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  interface Bucket {
    key: string;
    courseCode: string | null;
    courseTitle: string;
    displayName: string;
    department: string;
    year: number;
    section: string;
    sessions: StudentAttendanceSession[];
  }

  const buckets = new Map<string, Bucket>();
  const stuDept = studentSection.department.trim().toUpperCase();
  const stuSec = studentSection.section.trim().toUpperCase();

  // Seed buckets for all enrolled courses in the student's current section
  // so courses with 0 held classes cleanly show "Not enough attendance data yet".
  for (const course of enrolledCourses) {
    const cDept = course.department.trim().toUpperCase();
    const cSections = course.sections?.map((s) => s.trim().toUpperCase()) || [stuSec];
    if (cDept === stuDept && course.year === studentSection.year && cSections.includes(stuSec)) {
      const key = `${course.code.trim().toUpperCase()}::${cDept}::${course.year}::${stuSec}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          courseCode: course.code,
          courseTitle: course.title,
          displayName: `${course.code} — ${course.title}`,
          department: course.department,
          year: course.year,
          section: studentSection.section,
          sessions: [],
        });
      }
    }
  }

  // Assign each attendance session strictly to its matching course + section bucket
  for (const session of sessions) {
    const dept = (session.department || studentSection.department).trim().toUpperCase();
    const year = session.year || studentSection.year;
    const sec = (session.section || studentSection.section).trim().toUpperCase();

    const matchedCourse = findMatchingCourse(
      { ...session, department: dept, year, section: sec },
      enrolledCourses
    );

    let courseKey: string;
    let courseCode: string | null = null;
    let courseTitle: string;
    let displayName: string;

    if (matchedCourse) {
      courseCode = matchedCourse.code;
      courseTitle = matchedCourse.title;
      displayName = `${matchedCourse.code} — ${matchedCourse.title}`;
      courseKey = matchedCourse.code.trim().toUpperCase();
    } else if (session.courseCode && session.courseCode.trim()) {
      courseCode = session.courseCode.trim().toUpperCase();
      courseTitle = (session.subject || courseCode).trim();
      displayName =
        courseTitle.toUpperCase() === courseCode
          ? courseCode
          : `${courseCode} — ${courseTitle}`;
      courseKey = courseCode;
    } else {
      const subjectLabel = (session.subject || 'General Session').trim();
      courseTitle = subjectLabel;
      displayName = subjectLabel;
      courseKey = `SUBJECT:${subjectLabel.toLowerCase()}`;
    }

    const key = `${courseKey}::${dept}::${year}::${sec}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        courseCode,
        courseTitle,
        displayName,
        department: session.department || studentSection.department,
        year,
        section: session.section || studentSection.section,
        sessions: [],
      });
    }
    buckets.get(key)!.sessions.push(session);
  }

  const results: CourseSectionAttendanceAnalysis[] = [];
  for (const bucket of buckets.values()) {
    const recorded = bucket.sessions.filter(
      (s) => s.status === 'present' || s.status === 'absent'
    );
    const attended = recorded.filter((s) => s.status === 'present').length;
    const held = recorded.length;
    const currentPercentage = held > 0 ? (100 * attended) / held : null;

    const threshold =
      requiredPercentage !== null && requiredPercentage !== undefined
        ? calculateAttendanceThreshold(attended, held, requiredPercentage)
        : null;

    const regression = computeAttendanceRegressionForecast(recorded);

    results.push({
      key: bucket.key,
      courseCode: bucket.courseCode,
      courseTitle: bucket.courseTitle,
      displayName: bucket.displayName,
      department: bucket.department,
      year: bucket.year,
      section: bucket.section,
      attended,
      held,
      currentPercentage,
      threshold,
      regression,
    });
  }

  return results.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

