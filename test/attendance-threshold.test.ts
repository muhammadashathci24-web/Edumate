import { describe, it, expect } from 'vitest';
import {
  calculateAttendanceThreshold,
  validateAttendanceRequirement,
  formatAttendancePercentage,
} from '../src/lib/attendanceAnalysis';

describe('Attendance Threshold Calculation', () => {
  it('handles A=78, H=100, R=75%: allows up to 4 safe absences, 5th falls below 75%', () => {
    const res = calculateAttendanceThreshold(78, 100, 75);
    expect(res.currentPercentage).toBeCloseTo(78, 10);
    expect(res.safeAbsences).toBe(4);
    expect(res.isBelowRequirement).toBe(false);
    expect(res.status).toBe('safe');
    expect((78 / 104) * 100).toBeGreaterThanOrEqual(75);
    expect((78 / 105) * 100).toBeLessThan(75);
    expect(res.explanation).toContain('78 of 100 classes (78%)');
    expect(res.explanation).toContain('Required: 75%');
    expect(res.explanation).toContain('up to 4 more classes');
  });

  it('handles A=74, H=100, R=75%: already below requirement with zero safe absences', () => {
    const res = calculateAttendanceThreshold(74, 100, 75);
    expect(res.currentPercentage).toBeCloseTo(74, 10);
    expect(res.safeAbsences).toBe(0);
    expect(res.isBelowRequirement).toBe(true);
    expect(res.status).toBe('below_threshold');
    expect(res.explanation.toLowerCase()).toContain('already below');
    expect(res.explanation.toLowerCase()).toContain('zero additional absences');
  });

  it('handles A=0, H=0: returns insufficient data without dividing by zero', () => {
    const res = calculateAttendanceThreshold(0, 0, 75);
    expect(res.currentPercentage).toBeNull();
    expect(res.safeAbsences).toBeNull();
    expect(res.isBelowRequirement).toBe(false);
    expect(res.status).toBe('insufficient_data');
    expect(res.explanation.toLowerCase()).toContain('not enough attendance data yet');
  });

  it('handles perfect attendance with 100% requirement: zero future absences are safe', () => {
    const res = calculateAttendanceThreshold(25, 25, 100);
    expect(res.currentPercentage).toBe(100);
    expect(res.safeAbsences).toBe(0);
    expect(res.isBelowRequirement).toBe(false);
    expect(res.status).toBe('at_limit');
    expect(res.explanation).toContain('Required: 100%');
    expect(res.explanation).toContain('zero additional absences');
  });

  it('validates configured requirement is strictly > 0 and <= 100', () => {
    expect(validateAttendanceRequirement(0).valid).toBe(false);
    expect(validateAttendanceRequirement(-10).valid).toBe(false);
    expect(validateAttendanceRequirement(100.01).valid).toBe(false);
    expect(validateAttendanceRequirement(Number.NaN).valid).toBe(false);
    expect(validateAttendanceRequirement(Number.POSITIVE_INFINITY).valid).toBe(false);

    expect(validateAttendanceRequirement(0.5).valid).toBe(true);
    expect(validateAttendanceRequirement(75).valid).toBe(true);
    expect(validateAttendanceRequirement(100).valid).toBe(true);

    expect(() => calculateAttendanceThreshold(10, 10, 0)).toThrow();
    expect(() => calculateAttendanceThreshold(10, 10, 101)).toThrow();
  });

  it('avoids floating-point rounding errors across tricky decimal boundaries', () => {
    // 17 / 0.85 = 20 exactly; 17/20 = 85%, missing 1 makes 17/21 = 80.95% < 85%
    const r85 = calculateAttendanceThreshold(17, 20, 85);
    expect(r85.safeAbsences).toBe(0);
    expect(r85.isBelowRequirement).toBe(false);

    // 7 / 0.7 = 10 exactly; 7/9 = 77.78%, 1 safe absence -> 7/10 = 70%
    const r70 = calculateAttendanceThreshold(7, 9, 70);
    expect(r70.safeAbsences).toBe(1);

    // 29 / 0.29 = 100 exactly -> 29/100 = 29% -> 0 safe absences
    const r29 = calculateAttendanceThreshold(29, 100, 29);
    expect(r29.safeAbsences).toBe(0);
    expect(r29.isBelowRequirement).toBe(false);

    // 749 / 1000 = 74.9% -> strictly below 75%, must not round up to 75%
    const rBelowDecimal = calculateAttendanceThreshold(749, 1000, 75);
    expect(rBelowDecimal.isBelowRequirement).toBe(true);
    expect(rBelowDecimal.safeAbsences).toBe(0);
    expect(formatAttendancePercentage(rBelowDecimal.currentPercentage!)).toBe('74.9%');
  });
});
