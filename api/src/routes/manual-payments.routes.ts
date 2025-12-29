import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { auth } from "../libs/auth";
import { ResponseBuilder } from "../core/response";
import { PaymentDomain } from "../features/payments/payments.domain";
import { LoansRepository } from "../features/loans/loans.repository";
import { logger } from "../core/logger";
import { z } from "zod";

const manualPaymentsRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

const paymentDomain = new PaymentDomain();
const loansRepo = new LoansRepository();

/**
 * Manual payment request schema
 */
const manualPaymentSchema = z.object({
  loanId: z.string().min(1, "Loan ID is required"),
  amount: z.number().positive("Amount must be positive"),
  paymentDate: z.string().transform((val) => new Date(val)),
  paymentMethod: z.enum(["Cash", "Check", "Bank Transfer"]),
  notes: z.string().optional(),
});

/**
 * Generate unique transaction reference ID for manual payments
 */
function generateManualTransactionRef(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MANUAL-${timestamp}-${random}`;
}

/**
 * POST /api/admin/payments/manual
 * Create a manual payment record for cash/check payments
 */
manualPaymentsRoutes.post("/manual", authMiddleware, async (c) => {
  try {
    // Get admin user from session
    const user = c.get("user");
    if (!user) {
      return ResponseBuilder.error(c, "Unauthorized", 401);
    }

    // Parse and validate request body
    const body = await c.req.json();
    const parseResult = manualPaymentSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return ResponseBuilder.error(c, errorMessages, 400);
    }

    const { loanId, amount, paymentDate, paymentMethod, notes } = parseResult.data;

    // Verify loan exists and is not closed
    const loan = await loansRepo.findById(loanId);
    if (!loan) {
      return ResponseBuilder.error(c, "Loan not found", 404);
    }

    if (loan.contract_status === "Closed") {
      return ResponseBuilder.error(c, "Cannot add payment to a closed loan", 400);
    }

    // Generate unique transaction reference
    const transactionRefId = generateManualTransactionRef();

    // Process the payment using existing payment domain
    const paymentResult = await paymentDomain.processPayment({
      transactionRefId,
      loanId,
      amount,
      paymentDate,
      paymentMethod,
      paymentSource: paymentMethod, // Use payment method as source for manual payments
      notes: notes ? `[Manual Payment] ${notes}` : "[Manual Payment]",
      processedBy: user.id,
    });

    logger.info(
      {
        transactionId: paymentResult.transactionId,
        loanId,
        amount,
        paymentMethod,
        processedBy: user.id,
        adminName: user.name,
      },
      "Manual payment processed successfully"
    );

    return ResponseBuilder.success(c, {
      message: "Payment recorded successfully",
      transaction: paymentResult,
    });
  } catch (error: any) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
      },
      "Failed to process manual payment"
    );

    return ResponseBuilder.error(
      c,
      error.message || "Failed to process manual payment",
      500
    );
  }
});

export default manualPaymentsRoutes;
