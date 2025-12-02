import { describe, test, expect, mock } from "bun:test";
import { PaymentNotificationService } from "./payment-notification.service";
import { LineMessagingClient } from "../line/line.client";
import type { PaymentNotificationData, LoanClosedNotificationData } from "./payments.types";

describe("Payment Notification Service", () => {
  test("sendPaymentConfirmation - should send notification without throwing", async () => {
    // Mock LINE client
    const mockLineClient = {
      pushMessage: mock(async () => {}),
    } as unknown as LineMessagingClient;

    const service = new PaymentNotificationService(mockLineClient);

    const paymentData: PaymentNotificationData = {
      amount: 1000,
      allocation: {
        toPenalties: 0,
        toInterest: 100,
        toPrincipal: 900,
        remaining: 0,
      },
      balanceAfter: 9000,
      transactionRefId: "TEST-REF-123",
      paymentDate: new Date("2024-01-15"),
      contractNumber: "LOAN-001",
    };

    // Should not throw even if successful
    await expect(
      service.sendPaymentConfirmation("U1234567890", paymentData)
    ).resolves.toBeUndefined();

    expect(mockLineClient.pushMessage).toHaveBeenCalledTimes(1);
  });

  test("sendPaymentConfirmation - should not throw on LINE API failure", async () => {
    // Mock LINE client that throws error
    const mockLineClient = {
      pushMessage: mock(async () => {
        throw new Error("LINE API error");
      }),
    } as unknown as LineMessagingClient;

    const service = new PaymentNotificationService(mockLineClient);

    const paymentData: PaymentNotificationData = {
      amount: 1000,
      allocation: {
        toPenalties: 50,
        toInterest: 100,
        toPrincipal: 850,
        remaining: 0,
      },
      balanceAfter: 9000,
      transactionRefId: "TEST-REF-456",
      paymentDate: new Date("2024-01-15"),
      contractNumber: "LOAN-002",
    };

    // Should not throw even if LINE API fails
    await expect(
      service.sendPaymentConfirmation("U1234567890", paymentData)
    ).resolves.toBeUndefined();

    expect(mockLineClient.pushMessage).toHaveBeenCalledTimes(1);
  });

  test("sendLoanClosedNotification - should send notification without throwing", async () => {
    // Mock LINE client
    const mockLineClient = {
      pushMessage: mock(async () => {}),
    } as unknown as LineMessagingClient;

    const service = new PaymentNotificationService(mockLineClient);

    const loanData: LoanClosedNotificationData = {
      contractNumber: "LOAN-003",
      totalPaid: 10000,
      finalPaymentDate: new Date("2024-12-31"),
    };

    // Should not throw even if successful
    await expect(
      service.sendLoanClosedNotification("U1234567890", loanData)
    ).resolves.toBeUndefined();

    expect(mockLineClient.pushMessage).toHaveBeenCalledTimes(1);
  });

  test("sendLoanClosedNotification - should not throw on LINE API failure", async () => {
    // Mock LINE client that throws error
    const mockLineClient = {
      pushMessage: mock(async () => {
        throw new Error("LINE API error");
      }),
    } as unknown as LineMessagingClient;

    const service = new PaymentNotificationService(mockLineClient);

    const loanData: LoanClosedNotificationData = {
      contractNumber: "LOAN-004",
      totalPaid: 15000,
      finalPaymentDate: new Date("2024-12-31"),
    };

    // Should not throw even if LINE API fails
    await expect(
      service.sendLoanClosedNotification("U1234567890", loanData)
    ).resolves.toBeUndefined();

    expect(mockLineClient.pushMessage).toHaveBeenCalledTimes(1);
  });

  test("sendPaymentConfirmation - should include all allocation details", async () => {
    let capturedMessage: any;
    const mockLineClient = {
      pushMessage: mock(async (_to: string, messages: any[]) => {
        capturedMessage = messages[0];
      }),
    } as unknown as LineMessagingClient;

    const service = new PaymentNotificationService(mockLineClient);

    const paymentData: PaymentNotificationData = {
      amount: 1500,
      allocation: {
        toPenalties: 200,
        toInterest: 300,
        toPrincipal: 1000,
        remaining: 0,
      },
      balanceAfter: 5000,
      transactionRefId: "TEST-REF-789",
      paymentDate: new Date("2024-01-15"),
      contractNumber: "LOAN-005",
    };

    await service.sendPaymentConfirmation("U1234567890", paymentData);

    expect(capturedMessage).toBeDefined();
    expect(capturedMessage.type).toBe("flex");
    expect(capturedMessage.altText).toContain("1,500");
    expect(capturedMessage.contents).toBeDefined();
  });

  test("sendPaymentConfirmation - should handle zero balance (loan closed)", async () => {
    let capturedMessage: any;
    const mockLineClient = {
      pushMessage: mock(async (_to: string, messages: any[]) => {
        capturedMessage = messages[0];
      }),
    } as unknown as LineMessagingClient;

    const service = new PaymentNotificationService(mockLineClient);

    const paymentData: PaymentNotificationData = {
      amount: 5000,
      allocation: {
        toPenalties: 0,
        toInterest: 500,
        toPrincipal: 4500,
        remaining: 0,
      },
      balanceAfter: 0, // Loan is now closed
      transactionRefId: "TEST-REF-999",
      paymentDate: new Date("2024-01-15"),
      contractNumber: "LOAN-006",
    };

    await service.sendPaymentConfirmation("U1234567890", paymentData);

    expect(capturedMessage).toBeDefined();
    expect(capturedMessage.type).toBe("flex");
  });
});
