import { describe, test, expect } from "bun:test";
import * as fc from "fast-check";
import { PaymentDomain } from "./payments.domain";

const paymentDomain = new PaymentDomain();

describe("Payment Domain - Property-Based Tests", () => {
  /**
   * Feature: payment-processing, Property 3: Waterfall Allocation Order
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   * 
   * For any payment amount and debt composition (penalties, accrued interest, principal),
   * the allocation should apply funds in strict priority order: first to penalties until
   * zero or payment exhausted, then to accrued interest until zero or payment exhausted,
   * then to principal. The sum of allocated amounts should equal the payment amount.
   */
  test("Property 3: Waterfall Allocation Order", () => {
    fc.assert(
      fc.property(
        // Generate non-negative financial amounts (up to 1 million)
        fc.double({ min: 0, max: 1_000_000, noNaN: true }),
        fc.double({ min: 0, max: 1_000_000, noNaN: true }),
        fc.double({ min: 0, max: 1_000_000, noNaN: true }),
        fc.double({ min: 0, max: 1_000_000, noNaN: true }),
        (paymentAmount, penalties, accruedInterest, principal) => {
          const allocation = paymentDomain.allocatePayment(
            paymentAmount,
            penalties,
            accruedInterest,
            principal
          );

          // Property 1: Sum of allocations equals payment amount
          const totalAllocated =
            allocation.toPenalties +
            allocation.toInterest +
            allocation.toPrincipal;
          const epsilon = 0.01; // Allow small floating point errors
          expect(Math.abs(totalAllocated + allocation.remaining - paymentAmount)).toBeLessThan(epsilon);

          // Property 2: Penalties are paid first (if payment > 0 and penalties > 0)
          if (paymentAmount > 0 && penalties > 0) {
            expect(allocation.toPenalties).toBeGreaterThan(0);
            expect(allocation.toPenalties).toBeLessThanOrEqual(Math.min(paymentAmount, penalties));
          }

          // Property 3: Interest is only paid after penalties are cleared or payment exhausted
          if (allocation.toInterest > 0) {
            // If we paid interest, either penalties were fully paid or we paid all available to penalties
            expect(
              allocation.toPenalties >= penalties || allocation.toPenalties >= paymentAmount
            ).toBe(true);
          }

          // Property 4: Principal is only paid after penalties and interest are cleared or payment exhausted
          if (allocation.toPrincipal > 0) {
            const paidToPenaltiesAndInterest = allocation.toPenalties + allocation.toInterest;
            // If we paid principal, either penalties+interest were fully paid or we paid all available
            expect(
              (allocation.toPenalties >= penalties && allocation.toInterest >= accruedInterest) ||
              paidToPenaltiesAndInterest >= paymentAmount
            ).toBe(true);
          }

          // Property 5: No allocation exceeds the debt in that category
          expect(allocation.toPenalties).toBeLessThanOrEqual(penalties + epsilon);
          expect(allocation.toInterest).toBeLessThanOrEqual(accruedInterest + epsilon);
          expect(allocation.toPrincipal).toBeLessThanOrEqual(principal + epsilon);

          // Property 6: All allocations are non-negative
          expect(allocation.toPenalties).toBeGreaterThanOrEqual(0);
          expect(allocation.toInterest).toBeGreaterThanOrEqual(0);
          expect(allocation.toPrincipal).toBeGreaterThanOrEqual(0);
          expect(allocation.remaining).toBeGreaterThanOrEqual(0);

          // Property 7: Remaining is only positive if all debts are paid
          if (allocation.remaining > epsilon) {
            expect(allocation.toPenalties).toBeCloseTo(penalties, 2);
            expect(allocation.toInterest).toBeCloseTo(accruedInterest, 2);
            expect(allocation.toPrincipal).toBeCloseTo(principal, 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: payment-processing, Property 4: Interest Calculation Consistency
   * Validates: Requirements 3.1, 3.2, 3.4
   * 
   * For any loan with an outstanding principal, interest rate, and date range,
   * the accrued interest calculated should equal (principal × annual_rate × days) / 365,
   * rounded to two decimal places.
   */
  test("Property 4: Interest Calculation Consistency", () => {
    fc.assert(
      fc.property(
        // Generate principal amount (1 to 1 million)
        fc.double({ min: 1, max: 1_000_000, noNaN: true }),
        // Generate annual interest rate (0.01 to 0.50 = 1% to 50%)
        fc.double({ min: 0.01, max: 0.50, noNaN: true }),
        // Generate number of days (0 to 3650 = ~10 years)
        fc.integer({ min: 0, max: 3650 }),
        (principal, annualRate, days) => {
          // Create dates with the specified day difference
          const lastPaymentDate = new Date("2024-01-01");
          const currentDate = new Date(lastPaymentDate);
          currentDate.setDate(currentDate.getDate() + days);

          const interest = paymentDomain.calculateAccruedInterest(
            principal,
            annualRate,
            lastPaymentDate,
            currentDate
          );

          // Calculate expected interest using the formula
          const expectedInterest = (principal * annualRate * days) / 365;
          const expectedRounded = Math.round(expectedInterest * 100) / 100;

          // Property 1: Result matches formula rounded to 2 decimal places
          expect(interest).toBe(expectedRounded);

          // Property 2: Interest is non-negative
          expect(interest).toBeGreaterThanOrEqual(0);

          // Property 3: Interest has at most 2 decimal places
          const decimalPlaces = (interest.toString().split('.')[1] || '').length;
          expect(decimalPlaces).toBeLessThanOrEqual(2);

          // Property 4: Interest is proportional to principal
          // If we double the principal, interest should double (within rounding)
          const doubledInterest = paymentDomain.calculateAccruedInterest(
            principal * 2,
            annualRate,
            lastPaymentDate,
            currentDate
          );
          // Allow small rounding differences
          expect(Math.abs(doubledInterest - interest * 2)).toBeLessThan(0.02);

          // Property 5: Interest is proportional to rate
          // If we double the rate, interest should double (within rounding)
          const doubledRateInterest = paymentDomain.calculateAccruedInterest(
            principal,
            annualRate * 2,
            lastPaymentDate,
            currentDate
          );
          expect(Math.abs(doubledRateInterest - interest * 2)).toBeLessThan(0.02);

          // Property 6: Zero days means zero interest
          const zeroDate = new Date(lastPaymentDate);
          const zeroInterest = paymentDomain.calculateAccruedInterest(
            principal,
            annualRate,
            lastPaymentDate,
            zeroDate
          );
          expect(zeroInterest).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: payment-processing, Property 7: Loan Status Transition to Closed
   * Validates: Requirements 5.1
   * 
   * For any loan with a positive outstanding balance, if a payment reduces the
   * outstanding balance to zero or below, then the loan status should transition to Closed.
   */
  test("Property 7: Loan Status Transition to Closed", () => {
    fc.assert(
      fc.property(
        // Generate current status (Active or Overdue)
        fc.constantFrom("Active", "Overdue"),
        // Generate positive outstanding balance
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
        // Generate overdue amount (0 to balance)
        fc.double({ min: 0, max: 100_000, noNaN: true }),
        (currentStatus, outstandingBalance, overdueAmount) => {
          // Test with balance at zero
          const statusAtZero = paymentDomain.determineLoanStatus(
            currentStatus,
            0,
            overdueAmount
          );
          expect(statusAtZero).toBe("Closed");

          // Test with negative balance (overpayment)
          const statusNegative = paymentDomain.determineLoanStatus(
            currentStatus,
            -0.01,
            overdueAmount
          );
          expect(statusNegative).toBe("Closed");

          // Test with positive balance should NOT be Closed
          const statusPositive = paymentDomain.determineLoanStatus(
            currentStatus,
            outstandingBalance,
            overdueAmount
          );
          if (outstandingBalance > 0) {
            expect(statusPositive).not.toBe("Closed");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: payment-processing, Property 8: Loan Status Transition from Overdue to Active
   * Validates: Requirements 5.2
   * 
   * For any loan in Overdue status, if a payment brings all overdue amounts current
   * (clears all penalties and overdue interest), then the loan status should transition to Active.
   */
  test("Property 8: Loan Status Transition from Overdue to Active", () => {
    fc.assert(
      fc.property(
        // Generate positive outstanding balance
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
        (outstandingBalance) => {
          // When overdue amount is cleared (0 or negative), status should be Active
          const statusCleared = paymentDomain.determineLoanStatus(
            "Overdue",
            outstandingBalance,
            0
          );
          expect(statusCleared).toBe("Active");

          const statusNegative = paymentDomain.determineLoanStatus(
            "Overdue",
            outstandingBalance,
            -0.01
          );
          expect(statusNegative).toBe("Active");

          // When overdue amount remains, status should stay Overdue
          const statusRemaining = paymentDomain.determineLoanStatus(
            "Overdue",
            outstandingBalance,
            0.01
          );
          expect(statusRemaining).toBe("Overdue");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: payment-processing, Property 9: Status Preservation for Partial Payments
   * Validates: Requirements 5.3, 5.4
   * 
   * For any Active loan receiving a partial payment (payment less than outstanding balance),
   * the loan status should remain Active. For any Overdue loan receiving a partial payment
   * that doesn't clear overdue amounts, the status should remain Overdue.
   */
  test("Property 9: Status Preservation for Partial Payments", () => {
    fc.assert(
      fc.property(
        // Generate positive outstanding balance
        fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
        // Generate positive overdue amount
        fc.double({ min: 0.01, max: 100_000, noNaN: true }),
        (outstandingBalance, overdueAmount) => {
          // Active loan with positive balance should remain Active
          const activeStatus = paymentDomain.determineLoanStatus(
            "Active",
            outstandingBalance,
            0
          );
          expect(activeStatus).toBe("Active");

          // Overdue loan with remaining overdue amount should remain Overdue
          const overdueStatus = paymentDomain.determineLoanStatus(
            "Overdue",
            outstandingBalance,
            overdueAmount
          );
          expect(overdueStatus).toBe("Overdue");

          // Closed loan should remain Closed (edge case)
          const closedStatus = paymentDomain.determineLoanStatus(
            "Closed",
            outstandingBalance,
            overdueAmount
          );
          expect(closedStatus).toBe("Closed");
        }
      ),
      { numRuns: 100 }
    );
  });
});
