import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Configure dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Calculate accrued interest from last payment date to current date
 * Uses Asia/Bangkok timezone for date calculations
 * Formula: (principal × annual_rate × days) / 365
 * 
 * @param principal - Outstanding principal amount
 * @param annualRate - Annual interest rate (as decimal, e.g., 0.15 for 15%)
 * @param lastPaymentDate - Date of last payment (or loan start date)
 * @param currentDate - Current date for calculation (defaults to now in Bangkok timezone)
 * @returns Accrued interest rounded to 2 decimal places
 */
export function calculateAccruedInterest(
  principal: number,
  annualRate: number,
  lastPaymentDate: Date | string,
  currentDate?: Date | string
): number {
  // Convert to Bangkok timezone for consistent date calculations
  const lastPayment = dayjs(lastPaymentDate).tz("Asia/Bangkok").startOf("day");
  const current = currentDate 
    ? dayjs(currentDate).tz("Asia/Bangkok").startOf("day")
    : dayjs().tz("Asia/Bangkok").startOf("day");

  // Calculate days between dates
  const daysDiff = current.diff(lastPayment, "day");

  // If no days have passed, no interest accrued
  if (daysDiff <= 0) {
    return 0;
  }

  // Calculate daily interest and multiply by days
  const interest = (principal * annualRate * daysDiff) / 365;

  // Round to 2 decimal places
  return Math.round(interest * 100) / 100;
}

/**
 * Calculate total balance including principal and accrued interest
 * 
 * @param principal - Outstanding principal amount
 * @param accruedInterest - Accrued interest amount
 * @returns Total balance rounded to 2 decimal places
 */
export function calculateTotalBalance(
  principal: number,
  accruedInterest: number
): number {
  const total = principal + accruedInterest;
  return Math.round(total * 100) / 100;
}

/**
 * Calculate penalty amount based on overdue days and penalty rate
 * Penalty is calculated as a percentage of the outstanding balance per day
 * 
 * @param outstandingBalance - Outstanding balance amount
 * @param daysOverdue - Number of days overdue
 * @param dailyPenaltyRate - Daily penalty rate (as decimal, e.g., 0.001 for 0.1% per day)
 * @returns Penalty amount rounded to 2 decimal places
 */
export function calculatePenalty(
  outstandingBalance: number,
  daysOverdue: number,
  dailyPenaltyRate: number = 0.001 // Default 0.1% per day
): number {
  if (daysOverdue <= 0) {
    return 0;
  }

  const penalty = outstandingBalance * dailyPenaltyRate * daysOverdue;
  return Math.round(penalty * 100) / 100;
}

/**
 * Format currency amount in Thai Baht with proper thousand separators
 * Format: ฿1,234.56
 * 
 * @param amount - Amount to format
 * @param includeCurrency - Whether to include ฿ symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  includeCurrency: boolean = true
): string {
  // Format with 2 decimal places and thousand separators
  const formatted = amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return includeCurrency ? `฿${formatted}` : formatted;
}

/**
 * Get current date in Asia/Bangkok timezone
 * Returns date at start of day (00:00:00)
 * 
 * @returns Date object in Bangkok timezone
 */
export function getCurrentDateBangkok(): Date {
  return dayjs().tz("Asia/Bangkok").startOf("day").toDate();
}

/**
 * Convert any date to Asia/Bangkok timezone
 * Returns date at start of day (00:00:00)
 * 
 * @param date - Date to convert
 * @returns Date object in Bangkok timezone
 */
export function toBangkokTimezone(date: Date | string): Date {
  return dayjs(date).tz("Asia/Bangkok").startOf("day").toDate();
}

/**
 * Calculate days between two dates in Asia/Bangkok timezone
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates
 */
export function calculateDaysBetween(
  startDate: Date | string,
  endDate: Date | string
): number {
  const start = dayjs(startDate).tz("Asia/Bangkok").startOf("day");
  const end = dayjs(endDate).tz("Asia/Bangkok").startOf("day");
  return end.diff(start, "day");
}
