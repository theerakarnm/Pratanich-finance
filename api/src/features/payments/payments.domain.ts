import type { PaymentAllocation } from "./payments.types";

/**
 * Payment Domain - Core business logic for payment processing
 */
export class PaymentDomain {
  /**
   * Allocate payment using waterfall method
   * Priority order: penalties → interest → principal
   * 
   * @param paymentAmount - Total payment amount to allocate
   * @param penalties - Current penalties/fees owed
   * @param accruedInterest - Current accrued interest owed
   * @param principal - Current principal balance
   * @returns PaymentAllocation breakdown
   */
  allocatePayment(
    paymentAmount: number,
    penalties: number,
    accruedInterest: number,
    principal: number
  ): PaymentAllocation {
    let remaining = paymentAmount;
    let toPenalties = 0;
    let toInterest = 0;
    let toPrincipal = 0;

    // Step 1: Allocate to penalties first
    if (remaining > 0 && penalties > 0) {
      toPenalties = Math.min(remaining, penalties);
      remaining -= toPenalties;
    }

    // Step 2: Allocate to accrued interest
    if (remaining > 0 && accruedInterest > 0) {
      toInterest = Math.min(remaining, accruedInterest);
      remaining -= toInterest;
    }

    // Step 3: Allocate to principal
    if (remaining > 0 && principal > 0) {
      toPrincipal = Math.min(remaining, principal);
      remaining -= toPrincipal;
    }

    return {
      toPenalties,
      toInterest,
      toPrincipal,
      remaining,
    };
  }

  /**
   * Calculate accrued interest from last payment date to current date
   * Formula: (principal × annual_rate × days) / 365
   * 
   * @param principal - Outstanding principal amount
   * @param annualRate - Annual interest rate (as decimal, e.g., 0.15 for 15%)
   * @param lastPaymentDate - Date of last payment (or loan start date)
   * @param currentDate - Current payment date
   * @returns Accrued interest rounded to 2 decimal places
   */
  calculateAccruedInterest(
    principal: number,
    annualRate: number,
    lastPaymentDate: Date,
    currentDate: Date
  ): number {
    // Calculate days between dates
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.floor(
      (currentDate.getTime() - lastPaymentDate.getTime()) / msPerDay
    );

    // Calculate daily interest and multiply by days
    const interest = (principal * annualRate * daysDiff) / 365;

    // Round to 2 decimal places
    return Math.round(interest * 100) / 100;
  }

  /**
   * Determine new loan status based on payment and balance
   * 
   * @param currentStatus - Current loan status
   * @param outstandingBalance - Outstanding balance after payment
   * @param overdueAmount - Amount that is overdue (penalties + overdue interest)
   * @returns New loan status
   */
  determineLoanStatus(
    currentStatus: string,
    outstandingBalance: number,
    overdueAmount: number
  ): string {
    // If balance is zero or negative, loan is closed
    if (outstandingBalance <= 0) {
      return "Closed";
    }

    // If loan was overdue and overdue amounts are cleared, transition to Active
    if (currentStatus === "Overdue" && overdueAmount <= 0) {
      return "Active";
    }

    // Otherwise, preserve current status
    return currentStatus;
  }
}

export const paymentDomain = new PaymentDomain();
