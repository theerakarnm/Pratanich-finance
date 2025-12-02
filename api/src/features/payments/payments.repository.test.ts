import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { paymentRepository } from "./payments.repository";
import { loansRepository } from "../loans/loans.repository";
import { db } from "../../core/database";
import { transactions } from "../../core/database/schema/transactions.schema";
import { loans } from "../../core/database/schema/loans.schema";
import { clients } from "../../core/database/schema/clients.schema";
import { eq } from "drizzle-orm";

describe("Payment Repository", () => {
  let testClientId: string;
  let testLoanId: string;
  const testTransactionRefId = `TEST-${Date.now()}`;

  beforeAll(async () => {
    // Create a test client
    const clientResult = await db
      .insert(clients)
      .values({
        citizen_id: `TEST-${Date.now()}`,
        title_name: "Mr.",
        first_name: "Test",
        last_name: "Client",
        date_of_birth: "1990-01-01",
        mobile_number: "0812345678",
        email: "test@example.com",
      })
      .returning();
    testClientId = clientResult[0].id;

    // Create a test loan
    const loanResult = await db
      .insert(loans)
      .values({
        contract_number: `TEST-LOAN-${Date.now()}`,
        client_id: testClientId,
        loan_type: "Personal Loan",
        principal_amount: "10000.00",
        approved_amount: "10000.00",
        interest_rate: "12.00",
        term_months: 12,
        installment_amount: "888.49",
        contract_start_date: "2024-01-01",
        contract_end_date: "2024-12-31",
        due_day: 15,
        contract_status: "Active",
        outstanding_balance: "10000.00",
      })
      .returning();
    testLoanId = loanResult[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(transactions).where(eq(transactions.loan_id, testLoanId));
    await db.delete(loans).where(eq(loans.id, testLoanId));
    await db.delete(clients).where(eq(clients.id, testClientId));
  });

  test("findByTransactionRef - should return null for non-existent transaction", async () => {
    const result = await paymentRepository.findByTransactionRef("NON-EXISTENT");
    expect(result).toBeNull();
  });

  test("createTransaction - should create a transaction record", async () => {
    const transactionData = {
      transaction_ref_id: testTransactionRefId,
      loan_id: testLoanId,
      client_id: testClientId,
      transaction_type: "Payment" as const,
      transaction_status: "Completed" as const,
      payment_date: new Date(),
      amount: "1000.00",
      amount_to_penalties: "0.00",
      amount_to_interest: "100.00",
      amount_to_principal: "900.00",
      balance_after: "9000.00",
      principal_remaining: "9100.00",
      payment_method: "Bank Transfer",
    };

    const result = await paymentRepository.createTransaction(transactionData);

    expect(result).toBeDefined();
    expect(result.transaction_ref_id).toBe(testTransactionRefId);
    expect(result.amount).toBe("1000.00");
  });

  test("findByTransactionRef - should find existing transaction", async () => {
    const result = await paymentRepository.findByTransactionRef(testTransactionRefId);
    expect(result).not.toBeNull();
    expect(result?.transaction_ref_id).toBe(testTransactionRefId);
  });

  test("findById - should return transaction with loan and client details", async () => {
    const transaction = await paymentRepository.findByTransactionRef(testTransactionRefId);
    expect(transaction).not.toBeNull();

    const result = await paymentRepository.findById(transaction!.id);
    expect(result).not.toBeNull();
    expect(result?.transaction.id).toBe(transaction!.id);
    expect(result?.loan.id).toBe(testLoanId);
    expect(result?.client.id).toBe(testClientId);
  });

  test("findPaymentHistory - should return transactions for a loan", async () => {
    const result = await paymentRepository.findPaymentHistory(testLoanId, 10, 0);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].loan_id).toBe(testLoanId);
  });

  test("countPayments - should return correct count", async () => {
    const count = await paymentRepository.countPayments(testLoanId);
    expect(count).toBeGreaterThan(0);
  });

  test("processPaymentTransaction - should process payment atomically", async () => {
    const transactionData = {
      transaction_ref_id: `TEST-ATOMIC-${Date.now()}`,
      loan_id: testLoanId,
      client_id: testClientId,
      transaction_type: "Payment" as const,
      transaction_status: "Completed" as const,
      payment_date: new Date(),
      amount: "500.00",
      amount_to_penalties: "0.00",
      amount_to_interest: "50.00",
      amount_to_principal: "450.00",
      balance_after: "8500.00",
      principal_remaining: "8650.00",
    };

    const loanUpdates = {
      outstanding_balance: "8500.00",
      principal_paid: "1350.00",
      interest_paid: "150.00",
      penalties_paid: "0.00",
      last_payment_date: new Date(),
      last_payment_amount: "500.00",
      total_penalties: "0.00",
    };

    const result = await paymentRepository.processPaymentTransaction(
      testLoanId,
      transactionData,
      loanUpdates
    );

    expect(result).toBeDefined();
    expect(result.transaction_ref_id).toBe(transactionData.transaction_ref_id);

    // Verify loan was updated
    const updatedLoan = await loansRepository.findById(testLoanId);
    expect(updatedLoan?.outstanding_balance).toBe("8500.00");
    expect(updatedLoan?.principal_paid).toBe("1350.00");
  });

  test("processPaymentTransaction - should rollback on error", async () => {
    const transactionData = {
      transaction_ref_id: `TEST-ROLLBACK-${Date.now()}`,
      loan_id: "NON-EXISTENT-LOAN-ID", // This will cause an error
      client_id: testClientId,
      transaction_type: "Payment" as const,
      transaction_status: "Completed" as const,
      payment_date: new Date(),
      amount: "500.00",
      amount_to_penalties: "0.00",
      amount_to_interest: "50.00",
      amount_to_principal: "450.00",
      balance_after: "8000.00",
      principal_remaining: "8200.00",
    };

    const loanUpdates = {
      outstanding_balance: "8000.00",
      principal_paid: "1800.00",
      interest_paid: "200.00",
      penalties_paid: "0.00",
      last_payment_date: new Date(),
      last_payment_amount: "500.00",
      total_penalties: "0.00",
    };

    // This should throw an error and rollback
    await expect(
      paymentRepository.processPaymentTransaction(
        "NON-EXISTENT-LOAN-ID",
        transactionData,
        loanUpdates
      )
    ).rejects.toThrow();

    // Verify transaction was not created
    const transaction = await paymentRepository.findByTransactionRef(
      transactionData.transaction_ref_id
    );
    expect(transaction).toBeNull();
  });
});
