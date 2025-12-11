// import { describe, test, expect, beforeAll, afterAll } from "bun:test";
// import { ReceiptGenerator } from "./receipt.generator";
// import { rm, mkdir } from "fs/promises";
// import { join } from "path";
// import type { TransactionWithDetails } from "./payments.types";

// describe("ReceiptGenerator", () => {
//   const testStoragePath = join(process.cwd(), "test-receipts");
//   let generator: ReceiptGenerator;

//   beforeAll(async () => {
//     // Create test directory
//     await mkdir(testStoragePath, { recursive: true });
//     generator = new ReceiptGenerator(testStoragePath);
//   });

//   afterAll(async () => {
//     // Clean up test directory
//     await rm(testStoragePath, { recursive: true, force: true });
//   });

//   test("generateReceipt creates a valid PDF buffer", async () => {
//     const mockTransaction: TransactionWithDetails = {
//       transaction: {
//         id: "test-txn-123",
//         transaction_ref_id: "TXN-2024-001",
//         loan_id: "loan-123",
//         client_id: "client-123",
//         transaction_type: "Payment",
//         transaction_status: "Completed",
//         payment_date: new Date("2024-01-15"),
//         amount: "5000.00",
//         amount_to_penalties: "500.00",
//         amount_to_interest: "1500.00",
//         amount_to_principal: "3000.00",
//         balance_after: "45000.00",
//         principal_remaining: "42000.00",
//         payment_method: "Bank Transfer",
//         payment_source: "Bangkok Bank",
//         receipt_path: null,
//         notes: null,
//         processed_by: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//       },
//       loan: {
//         id: "loan-123",
//         contract_number: "LC-2024-001",
//         client_id: "client-123",
//         loan_type: "Personal Loan",
//         principal_amount: "50000.00",
//         approved_amount: "50000.00",
//         interest_rate: "15.00",
//         term_months: 12,
//         installment_amount: "4500.00",
//         contract_start_date: "2024-01-01",
//         contract_end_date: "2024-12-31",
//         due_day: 15,
//         contract_status: "Active",
//         outstanding_balance: "45000.00",
//         overdue_days: 0,
//         principal_paid: "8000.00",
//         interest_paid: "2000.00",
//         penalties_paid: "500.00",
//         total_penalties: "500.00",
//         last_payment_date: new Date("2024-01-15"),
//         last_payment_amount: "5000.00",
//         previous_status: null,
//         status_changed_at: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//         deleted_at: null,
//       },
//       client: {
//         id: "client-123",
//         citizen_id: "1234567890123",
//         title_name: "นาย",
//         first_name: "สมชาย",
//         last_name: "ใจดี",
//         date_of_birth: "1990-01-01",
//         mobile_number: "0812345678",
//         email: null,
//         line_id: null,
//         line_user_id: null,
//         line_display_name: null,
//         line_picture_url: null,
//         connected_at: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//         deleted_at: null,
//       },
//     };

//     const pdfBuffer = await generator.generateReceipt(mockTransaction);

//     // Verify it's a valid PDF buffer
//     expect(pdfBuffer).toBeInstanceOf(Buffer);
//     expect(pdfBuffer.length).toBeGreaterThan(0);

//     // Check PDF magic number (PDF files start with %PDF)
//     const pdfHeader = pdfBuffer.toString("utf8", 0, 4);
//     expect(pdfHeader).toBe("%PDF");
//   });

//   test("saveReceipt creates file with correct path structure", async () => {
//     const mockTransaction: TransactionWithDetails = {
//       transaction: {
//         id: "test-txn-456",
//         transaction_ref_id: "TXN-2024-002",
//         loan_id: "loan-456",
//         client_id: "client-456",
//         transaction_type: "Payment",
//         transaction_status: "Completed",
//         payment_date: new Date("2024-01-20"),
//         amount: "3000.00",
//         amount_to_penalties: "0.00",
//         amount_to_interest: "1000.00",
//         amount_to_principal: "2000.00",
//         balance_after: "25000.00",
//         principal_remaining: "23000.00",
//         payment_method: "PromptPay",
//         payment_source: null,
//         receipt_path: null,
//         notes: null,
//         processed_by: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//       },
//       loan: {
//         id: "loan-456",
//         contract_number: "LC-2024-002",
//         client_id: "client-456",
//         loan_type: "Business Loan",
//         principal_amount: "30000.00",
//         approved_amount: "30000.00",
//         interest_rate: "12.00",
//         term_months: 12,
//         installment_amount: "2700.00",
//         contract_start_date: "2024-01-01",
//         contract_end_date: "2024-12-31",
//         due_day: 20,
//         contract_status: "Active",
//         outstanding_balance: "25000.00",
//         overdue_days: 0,
//         principal_paid: "7000.00",
//         interest_paid: "1500.00",
//         penalties_paid: "0.00",
//         total_penalties: "0.00",
//         last_payment_date: new Date("2024-01-20"),
//         last_payment_amount: "3000.00",
//         previous_status: null,
//         status_changed_at: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//         deleted_at: null,
//       },
//       client: {
//         id: "client-456",
//         citizen_id: "9876543210987",
//         title_name: "นาง",
//         first_name: "สมศรี",
//         last_name: "รักดี",
//         date_of_birth: "1985-05-15",
//         mobile_number: "0823456789",
//         email: null,
//         line_id: null,
//         line_user_id: null,
//         line_display_name: null,
//         line_picture_url: null,
//         connected_at: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//         deleted_at: null,
//       },
//     };

//     const pdfBuffer = await generator.generateReceipt(mockTransaction);
//     const relativePath = await generator.saveReceipt("test-txn-456", pdfBuffer);

//     // Verify path format: receipts/{year}/{month}/{transactionId}.pdf
//     expect(relativePath).toMatch(/^receipts\/\d{4}\/\d{2}\/test-txn-456\.pdf$/);
//   });

//   test("generateReceipt handles loan with zero penalties", async () => {
//     const mockTransaction: TransactionWithDetails = {
//       transaction: {
//         id: "test-txn-789",
//         transaction_ref_id: "TXN-2024-003",
//         loan_id: "loan-789",
//         client_id: "client-789",
//         transaction_type: "Payment",
//         transaction_status: "Completed",
//         payment_date: new Date("2024-02-01"),
//         amount: "2000.00",
//         amount_to_penalties: "0.00",
//         amount_to_interest: "500.00",
//         amount_to_principal: "1500.00",
//         balance_after: "10000.00",
//         principal_remaining: "9500.00",
//         payment_method: "Cash",
//         payment_source: null,
//         receipt_path: null,
//         notes: null,
//         processed_by: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//       },
//       loan: {
//         id: "loan-789",
//         contract_number: "LC-2024-003",
//         client_id: "client-789",
//         loan_type: "Short-term Loan",
//         principal_amount: "15000.00",
//         approved_amount: "15000.00",
//         interest_rate: "10.00",
//         term_months: 6,
//         installment_amount: "2600.00",
//         contract_start_date: "2024-01-01",
//         contract_end_date: "2024-06-30",
//         due_day: 1,
//         contract_status: "Active",
//         outstanding_balance: "10000.00",
//         overdue_days: 0,
//         principal_paid: "5500.00",
//         interest_paid: "1000.00",
//         penalties_paid: "0.00",
//         total_penalties: "0.00",
//         last_payment_date: new Date("2024-02-01"),
//         last_payment_amount: "2000.00",
//         previous_status: null,
//         status_changed_at: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//         deleted_at: null,
//       },
//       client: {
//         id: "client-789",
//         citizen_id: "5555555555555",
//         title_name: "นาย",
//         first_name: "วิชัย",
//         last_name: "มั่นคง",
//         date_of_birth: "1992-12-25",
//         mobile_number: "0891234567",
//         email: null,
//         line_id: null,
//         line_user_id: null,
//         line_display_name: null,
//         line_picture_url: null,
//         connected_at: null,
//         created_at: new Date(),
//         updated_at: new Date(),
//         deleted_at: null,
//       },
//     };

//     const pdfBuffer = await generator.generateReceipt(mockTransaction);

//     expect(pdfBuffer).toBeInstanceOf(Buffer);
//     expect(pdfBuffer.length).toBeGreaterThan(0);
//   });
// });
