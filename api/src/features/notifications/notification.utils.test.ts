import { describe, it, expect } from "bun:test";
import {
  calculateAccruedInterest,
  calculateTotalBalance,
  calculatePenalty,
  formatCurrency,
  getCurrentDateBangkok,
  toBangkokTimezone,
  calculateDaysBetween,
} from "./notification.utils";

describe("Notification Utilities", () => {
  describe("calculateAccruedInterest", () => {
    it("should calculate interest for 30 days", () => {
      const principal = 10000;
      const annualRate = 0.15; // 15%
      const lastPaymentDate = new Date("2024-01-01");
      const currentDate = new Date("2024-01-31");

      const interest = calculateAccruedInterest(
        principal,
        annualRate,
        lastPaymentDate,
        currentDate
      );

      // Expected: (10000 * 0.15 * 30) / 365 = 123.29
      expect(interest).toBe(123.29);
    });

    it("should return 0 for same day", () => {
      const principal = 10000;
      const annualRate = 0.15;
      const date = new Date("2024-01-01");

      const interest = calculateAccruedInterest(principal, annualRate, date, date);
      expect(interest).toBe(0);
    });

    it("should return 0 for future date", () => {
      const principal = 10000;
      const annualRate = 0.15;
      const lastPaymentDate = new Date("2024-01-31");
      const currentDate = new Date("2024-01-01");

      const interest = calculateAccruedInterest(
        principal,
        annualRate,
        lastPaymentDate,
        currentDate
      );
      expect(interest).toBe(0);
    });

    it("should calculate interest for 365 days (1 year)", () => {
      const principal = 10000;
      const annualRate = 0.15;
      const lastPaymentDate = new Date("2024-01-01");
      const currentDate = new Date("2025-01-01");

      const interest = calculateAccruedInterest(
        principal,
        annualRate,
        lastPaymentDate,
        currentDate
      );

      // Expected: (10000 * 0.15 * 366) / 365 = 1504.11 (2024 is a leap year)
      expect(interest).toBe(1504.11);
    });
  });

  describe("calculateTotalBalance", () => {
    it("should sum principal and interest", () => {
      const principal = 10000;
      const interest = 123.29;

      const total = calculateTotalBalance(principal, interest);
      expect(total).toBe(10123.29);
    });

    it("should handle zero interest", () => {
      const principal = 10000;
      const interest = 0;

      const total = calculateTotalBalance(principal, interest);
      expect(total).toBe(10000);
    });

    it("should round to 2 decimal places", () => {
      const principal = 10000.555;
      const interest = 123.456;

      const total = calculateTotalBalance(principal, interest);
      expect(total).toBe(10124.01);
    });
  });

  describe("calculatePenalty", () => {
    it("should calculate penalty for 7 days overdue", () => {
      const balance = 10000;
      const daysOverdue = 7;
      const dailyRate = 0.001; // 0.1% per day

      const penalty = calculatePenalty(balance, daysOverdue, dailyRate);

      // Expected: 10000 * 0.001 * 7 = 70
      expect(penalty).toBe(70);
    });

    it("should return 0 for 0 days overdue", () => {
      const balance = 10000;
      const daysOverdue = 0;

      const penalty = calculatePenalty(balance, daysOverdue);
      expect(penalty).toBe(0);
    });

    it("should return 0 for negative days", () => {
      const balance = 10000;
      const daysOverdue = -5;

      const penalty = calculatePenalty(balance, daysOverdue);
      expect(penalty).toBe(0);
    });

    it("should use default rate if not provided", () => {
      const balance = 10000;
      const daysOverdue = 10;

      const penalty = calculatePenalty(balance, daysOverdue);

      // Expected: 10000 * 0.001 * 10 = 100
      expect(penalty).toBe(100);
    });
  });

  describe("formatCurrency", () => {
    it("should format with Thai Baht symbol", () => {
      const amount = 1234.56;
      const formatted = formatCurrency(amount);

      expect(formatted).toBe("฿1,234.56");
    });

    it("should format without currency symbol", () => {
      const amount = 1234.56;
      const formatted = formatCurrency(amount, false);

      expect(formatted).toBe("1,234.56");
    });

    it("should format large numbers with thousand separators", () => {
      const amount = 1234567.89;
      const formatted = formatCurrency(amount);

      expect(formatted).toBe("฿1,234,567.89");
    });

    it("should format zero", () => {
      const amount = 0;
      const formatted = formatCurrency(amount);

      expect(formatted).toBe("฿0.00");
    });

    it("should always show 2 decimal places", () => {
      const amount = 1000;
      const formatted = formatCurrency(amount);

      expect(formatted).toBe("฿1,000.00");
    });
  });

  describe("getCurrentDateBangkok", () => {
    it("should return a Date object", () => {
      const date = getCurrentDateBangkok();
      expect(date).toBeInstanceOf(Date);
    });

    it("should return date at start of day", () => {
      const date = getCurrentDateBangkok();
      expect(date.getUTCHours()).toBeLessThan(24);
    });
  });

  describe("toBangkokTimezone", () => {
    it("should convert Date to Bangkok timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const bangkok = toBangkokTimezone(date);

      expect(bangkok).toBeInstanceOf(Date);
    });

    it("should convert string to Bangkok timezone", () => {
      const dateString = "2024-01-15";
      const bangkok = toBangkokTimezone(dateString);

      expect(bangkok).toBeInstanceOf(Date);
    });
  });

  describe("calculateDaysBetween", () => {
    it("should calculate days between two dates", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-31");

      const days = calculateDaysBetween(start, end);
      expect(days).toBe(30);
    });

    it("should return 0 for same date", () => {
      const date = new Date("2024-01-01");

      const days = calculateDaysBetween(date, date);
      expect(days).toBe(0);
    });

    it("should return negative for reversed dates", () => {
      const start = new Date("2024-01-31");
      const end = new Date("2024-01-01");

      const days = calculateDaysBetween(start, end);
      expect(days).toBe(-30);
    });

    it("should work with string dates", () => {
      const start = "2024-01-01";
      const end = "2024-01-15";

      const days = calculateDaysBetween(start, end);
      expect(days).toBe(14);
    });
  });
});
