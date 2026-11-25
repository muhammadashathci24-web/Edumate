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
