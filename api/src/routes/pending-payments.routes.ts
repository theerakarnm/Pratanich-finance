import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { auth } from "../libs/auth";
import { ResponseBuilder } from "../core/response";
import { PendingPaymentsRepository } from "../features/payments/pending-payments.repository";
import { LoansRepository } from "../features/loans/loans.repository";
import { PaymentDomain } from "../features/payments/payments.domain";
import { logger } from "../core/logger";

const pendingPaymentsRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
}>();

const pendingPaymentsRepo = new PendingPaymentsRepository();
const loansRepo = new LoansRepository();
const paymentDomain = new PaymentDomain();

/**
 * GET /api/admin/pending-payments
 * List all unmatched pending payments
 */
pendingPaymentsRoutes.get("/", authMiddleware, async (c) => {
  try {
    const status = c.req.query("status");
    
    let pendingPayments;
    if (status === "unmatched" || !status) {
      pendingPayments = await pendingPaymentsRepo.findUnmatched();
    } else {
      pendingPayments = await pendingPaymentsRepo.findAll();
    }
    
    return ResponseBuilder.success(c, pendingPayments);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, "Failed to fetch pending payments");
    return ResponseBuilder.error(c, "Failed to fetch pending payments", 500);
  }
});

/**
 * GET /api/admin/pending-payments/:id
 * Get pending payment details with loan and client info
 */
pendingPaymentsRoutes.get("/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const pendingPayment = await pendingPaymentsRepo.findByIdWithDetails(id);
    
    if (!pendingPayment) {
      return ResponseBuilder.error(c, "Pending payment not found", 404);
    }
    
    return ResponseBuilder.success(c, pendingPayment);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, "Failed to fetch pending payment");
    return ResponseBuilder.error(c, "Failed to fetch pending payment", 500);
  }
});

/**
 * POST /api/admin/pending-payments/:id/match
 * Manually match a pending payment to a loan
 */
pendingPaymentsRoutes.post("/:id/match", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { loanId, adminNotes } = body;
    
    if (!loanId) {
      return ResponseBuilder.error(c, "Loan ID is required", 400);
    }
    
    // Get user ID from session
    const user = c.get("user");
    if (!user) {
      return ResponseBuilder.error(c, "Unauthorized", 401);
    }
    
    // Verify pending payment exists and is unmatched
    const pendingPayment = await pendingPaymentsRepo.findById(id);
    if (!pendingPayment) {
      return ResponseBuilder.error(c, "Pending payment not found", 404);
    }
    
    if (pendingPayment.status !== "Unmatched") {
      return ResponseBuilder.error(c, `Pending payment is already ${pendingPayment.status}`, 400);
    }
    
    // Verify loan exists and is not closed
    const loan = await loansRepo.findById(loanId);
    if (!loan) {
      return ResponseBuilder.error(c, "Loan not found", 404);
    }
    
    if (loan.contract_status === "Closed") {
      return ResponseBuilder.error(c, "Cannot match payment to a closed loan", 400);
    }
    
    // Update pending payment with matched loan
    const updated = await pendingPaymentsRepo.updateMatch(
      id,
      loanId,
      user.id,
      adminNotes
    );
    
    logger.info({
      pendingPaymentId: id,
      loanId,
      matchedBy: user.id,
    }, "Pending payment matched to loan");
    
    return ResponseBuilder.success(c, updated);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, "Failed to match pending payment");
    return ResponseBuilder.error(c, error.message || "Failed to match pending payment", 500);
  }
});

/**
 * POST /api/admin/pending-payments/:id/process
 * Process a matched pending payment
 */
pendingPaymentsRoutes.post("/:id/process", authMiddleware, async (c) => {
  const id = c.req.param("id");
  
  try {
    // Get user ID from session
    const user = c.get("user");
    if (!user) {
      return ResponseBuilder.error(c, "Unauthorized", 401);
    }
    
    // Verify pending payment exists and is matched
    const pendingPayment = await pendingPaymentsRepo.findById(id);
    if (!pendingPayment) {
      return ResponseBuilder.error(c, "Pending payment not found", 404);
    }
    
    if (pendingPayment.status !== "Matched") {
      return ResponseBuilder.error(c, `Pending payment must be matched before processing (current status: ${pendingPayment.status})`, 400);
    }
    
    if (!pendingPayment.matched_loan_id) {
      return ResponseBuilder.error(c, "No loan matched to this pending payment", 400);
    }
    
    // Process the payment using the payment domain
    const paymentResult = await paymentDomain.processPayment({
      transactionRefId: pendingPayment.transaction_ref_id,
      loanId: pendingPayment.matched_loan_id,
      amount: Number(pendingPayment.amount),
      paymentDate: pendingPayment.payment_date,
      paymentMethod: "Bank Transfer",
      paymentSource: (pendingPayment.bank_info as any)?.sendingBank || "Unknown",
      notes: `Processed from pending payment ${id}. ${pendingPayment.admin_notes || ""}`,
      processedBy: user.id,
    });
    
    // Mark pending payment as processed
    await pendingPaymentsRepo.markProcessed(id, paymentResult.transactionId);
    
    logger.info({
      pendingPaymentId: id,
      transactionId: paymentResult.transactionId,
      loanId: pendingPayment.matched_loan_id,
      processedBy: user.id,
    }, "Pending payment processed successfully");
    
    return ResponseBuilder.success(c, {
      message: "Payment processed successfully",
      transaction: paymentResult,
    });
  } catch (error: any) {
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      pendingPaymentId: id,
    }, "Failed to process pending payment");
    
    return ResponseBuilder.error(c, error.message || "Failed to process pending payment", 500);
  }
});

/**
 * POST /api/admin/pending-payments/:id/reject
 * Reject a pending payment
 */
pendingPaymentsRoutes.post("/:id/reject", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { adminNotes } = body;
    
    if (!adminNotes) {
      return ResponseBuilder.error(c, "Admin notes are required for rejection", 400);
    }
    
    // Verify pending payment exists
    const pendingPayment = await pendingPaymentsRepo.findById(id);
    if (!pendingPayment) {
      return ResponseBuilder.error(c, "Pending payment not found", 404);
    }
    
    if (pendingPayment.status === "Processed") {
      return ResponseBuilder.error(c, "Cannot reject a processed payment", 400);
    }
    
    // Mark as rejected
    const updated = await pendingPaymentsRepo.markRejected(id, adminNotes);
    
    logger.info({
      pendingPaymentId: id,
      previousStatus: pendingPayment.status,
    }, "Pending payment rejected");
    
    return ResponseBuilder.success(c, updated);
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, "Failed to reject pending payment");
    return ResponseBuilder.error(c, "Failed to reject pending payment", 500);
  }
});

export default pendingPaymentsRoutes;
