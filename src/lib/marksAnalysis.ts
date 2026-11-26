/**
 * Three-Internal Marks Threshold (12/30 Average) & Simple Linear Regression Forecast
 *
 * Institutional rules:
 * - Three internal assessments per course (Internal 1, Internal 2, Internal 3), each out of 30.
 * - Minimum required overall average across all three assessments: 12 / 30 (total = 36 / 90).
 * - Independent per course, section, and student.
 * - Linear regression (x = internal number, y = score) only runs when >= 2 internals are recorded
 *   and at least 1 internal remains; predicted scores are clamped to [0, 30].
 */

import { CourseRef } from './attendanceAnalysis';

export const INTERNAL_ASSESSMENTS_COUNT = 3;
export const INTERNAL_MAX_MARKS = 30;
export const REQUIRED_INTERNAL_AVERAGE = 12;
export const REQUIRED_TOTAL_MARKS = INTERNAL_ASSESSMENTS_COUNT * REQUIRED_INTERNAL_AVERAGE; // 36

export interface StudentMarkEntry {
  id: string;
  assessmentTitle: string;
  maxMarks: number;
  obtainedMarks: number | null;
  department?: string;
  year?: number;
  section?: string;
  courseCode?: string;
  internalNumber?: number;
}

export interface RecordedInternalScore {
  internalNumber: 1 | 2 | 3;
  score: number; // out of 30
  rawScore: number;
  rawMaxMarks: number;
  assessmentTitle: string;
}

export interface PredictedInternalScore {
  internalNumber: 1 | 2 | 3;
  rawPredictedScore: number;
  clampedPredictedScore: number;
}

export type MarksEligibilityStatus =
  | 'no_data'
  | 'currently_below_target'
  | 'on_track'
  | 'projected_below_target'
  | 'projected_meets_target'
  | 'impossible_to_reach'
  | 'final_meets_target'
  | 'final_below_target';

export interface MarksRegressionResult {
  hasEnoughHistory: boolean;
  slope: number | null;
  intercept: number | null;
  predictedRemainingInternals: PredictedInternalScore[];
  projectedFinalAverage: number | null;
  projectedMeetsTarget: boolean | null;
  summary: string;
  disclaimer: string;
}

export interface CourseSectionMarksAnalysis {
  key: string;
  courseCode: string | null;
  courseTitle: string;
  displayName: string;
  department: string;
  year: number;
  section: string;
  recordedInternals: RecordedInternalScore[];
  recordedCount: number;
  remainingInternalNumbers: Array<1 | 2 | 3>;
  remainingCount: number;
  sumRecorded: number;
  currentAverage: number | null;
  requiredRemainingTotal: number;
  rawRequiredRemainingAverage: number | null;
  requiredRemainingAverage: number | null;
  cannotReachTarget: boolean;
  isFinal: boolean;
  actualFinalAverage: number | null;
  status: MarksEligibilityStatus;
  statusLabel: string;
  explanation: string;
  regression: MarksRegressionResult;
}

const MARKS_REGRESSION_DISCLAIMER =
  'Estimate only (simple linear regression on recorded internals) — not a final eligibility decision.';

export function formatMarksValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded)
    ? `${rounded}`
    : rounded.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Extracts internal number (1, 2, or 3) from explicit field or assessment title.
 */
export function resolveInternalNumber(
  entry: Pick<StudentMarkEntry, 'internalNumber' | 'assessmentTitle'>
): 1 | 2 | 3 | null {
  if (entry.internalNumber === 1 || entry.internalNumber === 2 || entry.internalNumber === 3) {
    return entry.internalNumber;
  }
  const title = (entry.assessmentTitle || '').toLowerCase();
  const match = title.match(/\b(?:internal|ia|test)\s*(?:assessment\s*)?([123])\b/);
  if (match) {
    const num = Number(match[1]);
    if (num === 1 || num === 2 || num === 3) return num;
  }
  return null;
}

function normalizeScoreOutOf30(obtained: number, maxMarks: number): number {
  if (maxMarks === INTERNAL_MAX_MARKS) {
    return obtained;
  }
  if (maxMarks <= 0) return 0;
  return (obtained / maxMarks) * INTERNAL_MAX_MARKS;
}

/**
 * Computes threshold, required remaining marks, and linear regression forecast
 * for a single course-section given the student's recorded internal scores.
 */
export function evaluateCourseInternals(
  recordedInputs: ReadonlyArray<RecordedInternalScore>,
  meta: {
    key: string;
    courseCode: string | null;
    courseTitle: string;
    displayName: string;
    department: string;
    year: number;
    section: string;
  }
): CourseSectionMarksAnalysis {
  // Deduplicate by internalNumber (latest entry wins) and sort chronologically 1 -> 2 -> 3
  const byNumber = new Map<1 | 2 | 3, RecordedInternalScore>();
  for (const item of recordedInputs) {
    if (item.internalNumber === 1 || item.internalNumber === 2 || item.internalNumber === 3) {
      if (item.score < 0 || item.score > INTERNAL_MAX_MARKS || !Number.isFinite(item.score)) {
        throw new Error(`Internal score must be between 0 and ${INTERNAL_MAX_MARKS}.`);
      }
      byNumber.set(item.internalNumber, item);
    }
  }

  const recordedInternals = ([1, 2, 3] as const)
    .filter((n) => byNumber.has(n))
    .map((n) => byNumber.get(n)!);

  const recordedCount = recordedInternals.length;
  const remainingInternalNumbers = ([1, 2, 3] as const).filter((n) => !byNumber.has(n));
  const remainingCount = remainingInternalNumbers.length;

  const sumRecorded = recordedInternals.reduce((acc, item) => acc + item.score, 0);
  const currentAverage = recordedCount > 0 ? sumRecorded / recordedCount : null;
  const requiredRemainingTotal = Math.max(0, REQUIRED_TOTAL_MARKS - sumRecorded);
  const rawRequiredRemainingAverage =
    remainingCount > 0 ? (REQUIRED_TOTAL_MARKS - sumRecorded) / remainingCount : null;
  const requiredRemainingAverage =
    rawRequiredRemainingAverage !== null ? Math.max(0, rawRequiredRemainingAverage) : null;
  const cannotReachTarget =
    rawRequiredRemainingAverage !== null && rawRequiredRemainingAverage > INTERNAL_MAX_MARKS;

  // Case 1: All 3 internals recorded -> final actual average, no forecast needed
  if (remainingCount === 0) {
    const actualFinalAverage = sumRecorded / INTERNAL_ASSESSMENTS_COUNT;
    const meets = actualFinalAverage >= REQUIRED_INTERNAL_AVERAGE;
    const avgText = formatMarksValue(actualFinalAverage);
    const scoresText = recordedInternals
      .map((r) => `${formatMarksValue(r.score)}/30`)
      .join(', ');

    return {
      ...meta,
      recordedInternals,
      recordedCount,
      remainingInternalNumbers,
      remainingCount,
      sumRecorded,
      currentAverage,
      requiredRemainingTotal: 0,
      rawRequiredRemainingAverage: null,
      requiredRemainingAverage: null,
      cannotReachTarget: false,
      isFinal: true,
      actualFinalAverage,
      status: meets ? 'final_meets_target' : 'final_below_target',
      statusLabel: meets ? 'Final average meets 12' : 'Final average does not meet 12',
      explanation: `Internals: ${scoresText} recorded. Final average: (${recordedInternals
        .map((r) => formatMarksValue(r.score))
        .join(' + ')}) / 3 = ${avgText}/30 (${meets ? 'meets' : 'does not meet'} the 12/30 requirement).`,
      regression: {
        hasEnoughHistory: false,
        slope: null,
        intercept: null,
        predictedRemainingInternals: [],
        projectedFinalAverage: null,
        projectedMeetsTarget: null,
        summary: 'All 3 internals are recorded; final average is actual rather than a prediction.',
        disclaimer: MARKS_REGRESSION_DISCLAIMER,
      },
    };
  }

  // Case 2: 0 internals recorded
  if (recordedCount === 0) {
    return {
      ...meta,
      recordedInternals,
      recordedCount,
      remainingInternalNumbers,
      remainingCount,
      sumRecorded: 0,
      currentAverage: null,
      requiredRemainingTotal: REQUIRED_TOTAL_MARKS,
      rawRequiredRemainingAverage: REQUIRED_INTERNAL_AVERAGE,
      requiredRemainingAverage: REQUIRED_INTERNAL_AVERAGE,
      cannotReachTarget: false,
      isFinal: false,
      actualFinalAverage: null,
      status: 'no_data',
      statusLabel: 'No internals recorded yet',
      explanation:
        'No internal scores recorded yet. Three internals remain; an average of 12/30 (36 total marks) is required.',
      regression: {
        hasEnoughHistory: false,
        slope: null,
        intercept: null,
        predictedRemainingInternals: [],
        projectedFinalAverage: null,
        projectedMeetsTarget: null,
        summary: 'At least two recorded internal scores are needed for a regression forecast.',
        disclaimer: MARKS_REGRESSION_DISCLAIMER,
      },
    };
  }

  // Case 3: 1 internal recorded -> no regression; show current average and required remaining average
  if (recordedCount < 2) {
    const only = recordedInternals[0];
    const currAvgText = formatMarksValue(currentAverage!);
    const reqAvgText = formatMarksValue(requiredRemainingAverage!);
    const isBelowNow = currentAverage! < REQUIRED_INTERNAL_AVERAGE;
    const status: MarksEligibilityStatus = cannotReachTarget
      ? 'impossible_to_reach'
      : isBelowNow
      ? 'currently_below_target'
      : 'on_track';
    const statusLabel = cannotReachTarget
      ? 'Cannot reach 12 average'
      : isBelowNow
      ? 'Currently below target'
      : 'On track (incomplete)';

    const explanation = cannotReachTarget
      ? `Internals: ${formatMarksValue(only.score)}/30 recorded. Current average: ${currAvgText}/30. ${remainingCount} internals remain; an average of ${reqAvgText}/30 would be needed ((36 - ${formatMarksValue(sumRecorded)}) / ${remainingCount} = ${reqAvgText}), which exceeds 30/30, so reaching a 12 average is not possible.`
      : `Internals: ${formatMarksValue(only.score)}/30 recorded. Current average: ${currAvgText}/30${isBelowNow ? ' (currently below target of 12/30)' : ''}. Two internals remain; an average of ${reqAvgText}/30 (${formatMarksValue(requiredRemainingTotal)} total marks) is needed in the remaining assessments to finish with a 12 average.`;

    return {
      ...meta,
      recordedInternals,
      recordedCount,
      remainingInternalNumbers,
      remainingCount,
      sumRecorded,
      currentAverage,
      requiredRemainingTotal,
      rawRequiredRemainingAverage,
      requiredRemainingAverage,
      cannotReachTarget,
      isFinal: false,
      actualFinalAverage: null,
      status,
      statusLabel,
      explanation,
      regression: {
        hasEnoughHistory: false,
        slope: null,
        intercept: null,
        predictedRemainingInternals: [],
        projectedFinalAverage: null,
        projectedMeetsTarget: null,
        summary: 'At least two recorded internal scores are needed for a regression forecast.',
        disclaimer: MARKS_REGRESSION_DISCLAIMER,
      },
    };
  }

  // Case 4: 2 internals recorded and 1 remains -> fit OLS regression (x = internalNumber, y = score)
  let sumX = 0;
  let sumY = 0;
  for (const r of recordedInternals) {
    sumX += r.internalNumber;
    sumY += r.score;
  }
  const xMean = sumX / recordedCount;
  const yMean = sumY / recordedCount;

  let sxx = 0;
  let sxy = 0;
  for (const r of recordedInternals) {
    const dx = r.internalNumber - xMean;
    const dy = r.score - yMean;
    sxx += dx * dx;
    sxy += dx * dy;
  }

  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yMean - slope * xMean;

  const predictedRemainingInternals: PredictedInternalScore[] = remainingInternalNumbers.map(
    (num) => {
      const rawPredictedScore = slope * num + intercept;
      const clampedPredictedScore = Math.min(INTERNAL_MAX_MARKS, Math.max(0, rawPredictedScore));
      return {
        internalNumber: num,
        rawPredictedScore,
        clampedPredictedScore,
      };
    }
  );

  const predictedSum = predictedRemainingInternals.reduce(
    (acc, p) => acc + p.clampedPredictedScore,
    0
  );
  const projectedFinalAverage = (sumRecorded + predictedSum) / INTERNAL_ASSESSMENTS_COUNT;
  const projectedMeetsTarget = projectedFinalAverage >= REQUIRED_INTERNAL_AVERAGE;

  const currAvgText = formatMarksValue(currentAverage!);
  const reqAvgText = formatMarksValue(requiredRemainingAverage!);
  const scoresText = recordedInternals.map((r) => `${formatMarksValue(r.score)}/30`).join(' and ');
  const sumText = formatMarksValue(sumRecorded);

  let status: MarksEligibilityStatus;
  let statusLabel: string;
  if (cannotReachTarget) {
    status = 'impossible_to_reach';
    statusLabel = 'Cannot reach 12 average';
  } else if (!projectedMeetsTarget) {
    status = 'projected_below_target';
    statusLabel = 'Projected below 12';
  } else if (currentAverage! < REQUIRED_INTERNAL_AVERAGE) {
    status = 'currently_below_target';
    statusLabel = 'Currently below target';
  } else {
    status = 'projected_meets_target';
    statusLabel = 'Projected to meet 12';
  }

  const remainingLabel = remainingCount === 1 ? 'One internal remains' : `${remainingCount} internals remain`;
  const marksNeededClause = cannotReachTarget
    ? `${reqAvgText} marks would be needed in Internal ${remainingInternalNumbers[0]} ((36 - ${sumText}) / ${remainingCount} = ${reqAvgText}), which exceeds the maximum 30 marks, so the student cannot reach a 12 average based on recorded marks.`
    : `${reqAvgText} ${requiredRemainingAverage === 1 ? 'mark is' : 'marks are'} needed in the final internal ((36 - ${sumText}) / ${remainingCount} = ${reqAvgText}) to finish with a 12 average.`;

  const explanation = `Internals: ${scoresText} recorded. Current average: ${currAvgText}/30. ${remainingLabel}; ${marksNeededClause}`;

  const predText = predictedRemainingInternals
    .map((p) => `Internal ${p.internalNumber}: ${formatMarksValue(p.clampedPredictedScore)}/30`)
    .join(', ');
  const projAvgText = formatMarksValue(projectedFinalAverage);
  const regressionSummary = `Predicted ${predText}; projected final average: ${projAvgText}/30 (${projectedMeetsTarget ? 'meets 12/30' : 'Projected below 12'}).`;

  return {
    ...meta,
    recordedInternals,
    recordedCount,
    remainingInternalNumbers,
    remainingCount,
    sumRecorded,
    currentAverage,
    requiredRemainingTotal,
    rawRequiredRemainingAverage,
    requiredRemainingAverage,
    cannotReachTarget,
    isFinal: false,
    actualFinalAverage: null,
    status,
    statusLabel,
    explanation,
    regression: {
      hasEnoughHistory: true,
      slope,
      intercept,
      predictedRemainingInternals,
      projectedFinalAverage,
      projectedMeetsTarget,
      summary: regressionSummary,
      disclaimer: MARKS_REGRESSION_DISCLAIMER,
    },
  };
}

function findMatchingCourseForMark(
  mark: StudentMarkEntry,
  courses: ReadonlyArray<CourseRef>,
  dept: string,
  year: number,
  section: string
): CourseRef | null {
  const sectionCourses = courses.filter(
    (c) =>
      c.department.trim().toUpperCase() === dept &&
      c.year === year &&
      (!c.sections || c.sections.map((s) => s.trim().toUpperCase()).includes(section))
  );

  if (mark.courseCode) {
    const codeUpper = mark.courseCode.trim().toUpperCase();
    const byCode = sectionCourses.find((c) => c.code.trim().toUpperCase() === codeUpper);
    if (byCode) return byCode;
  }

  const titleLower = (mark.assessmentTitle || '').toLowerCase();
  for (const c of sectionCourses) {
    if (
      titleLower.includes(c.code.toLowerCase()) ||
      titleLower.includes(c.title.toLowerCase())
    ) {
      return c;
    }
  }
  return null;
}

/**
 * Analyzes three-internal marks independently for each course and section.
 * Never combines marks records from different courses or sections.
 */
export function analyzeMarksByCourseSection(
  marks: ReadonlyArray<StudentMarkEntry>,
  enrolledCourses: ReadonlyArray<CourseRef>,
  studentSection: { department: string; year: number; section: string }
): CourseSectionMarksAnalysis[] {
  interface Bucket {
    key: string;
    courseCode: string | null;
    courseTitle: string;
    displayName: string;
    department: string;
    year: number;
    section: string;
    scores: RecordedInternalScore[];
  }

  const buckets = new Map<string, Bucket>();
  const stuDept = studentSection.department.trim().toUpperCase();
  const stuSec = studentSection.section.trim().toUpperCase();

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
          scores: [],
        });
      }
    }
  }

  for (const mark of marks) {
    if (mark.obtainedMarks === null || mark.obtainedMarks === undefined) {
      continue;
    }

    const internalNumber = resolveInternalNumber(mark);
    if (!internalNumber) {
      continue;
    }

    const dept = (mark.department || studentSection.department).trim().toUpperCase();
    const year = mark.year || studentSection.year;
    const sec = (mark.section || studentSection.section).trim().toUpperCase();

    const matchedCourse = findMatchingCourseForMark(mark, enrolledCourses, dept, year, sec);

    let courseKey: string;
    let courseCode: string | null = null;
    let courseTitle: string;
    let displayName: string;

    if (matchedCourse) {
      courseCode = matchedCourse.code;
      courseTitle = matchedCourse.title;
      displayName = `${matchedCourse.code} — ${matchedCourse.title}`;
      courseKey = matchedCourse.code.trim().toUpperCase();
    } else if (mark.courseCode && mark.courseCode.trim()) {
      courseCode = mark.courseCode.trim().toUpperCase();
      courseTitle = courseCode;
      displayName = courseCode;
      courseKey = courseCode;
    } else {
      const fallbackTitle = mark.assessmentTitle.trim() || 'Course Assessment';
      courseTitle = fallbackTitle;
      displayName = fallbackTitle;
      courseKey = `SUBJECT:${fallbackTitle.toLowerCase()}`;
    }

    const key = `${courseKey}::${dept}::${year}::${sec}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        courseCode,
        courseTitle,
        displayName,
        department: mark.department || studentSection.department,
        year,
        section: mark.section || studentSection.section,
        scores: [],
      });
    }

    const normalized = normalizeScoreOutOf30(mark.obtainedMarks, mark.maxMarks);
    buckets.get(key)!.scores.push({
      internalNumber,
      score: Math.min(INTERNAL_MAX_MARKS, Math.max(0, normalized)),
      rawScore: mark.obtainedMarks,
      rawMaxMarks: mark.maxMarks,
      assessmentTitle: mark.assessmentTitle,
    });
  }

  const results: CourseSectionMarksAnalysis[] = [];
  for (const bucket of buckets.values()) {
    results.push(
      evaluateCourseInternals(bucket.scores, {
        key: bucket.key,
        courseCode: bucket.courseCode,
        courseTitle: bucket.courseTitle,
        displayName: bucket.displayName,
        department: bucket.department,
        year: bucket.year,
        section: bucket.section,
      })
    );
  }

  return results.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
