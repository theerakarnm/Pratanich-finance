import { Hono } from "hono";
import { paymentDomain } from "../features/payments/payments.domain";
import { authMiddleware } from "../middleware/auth.middleware";
import { auth } from "../libs/auth";
import { ResponseBuilder } from "../core/response";
import { readFile } from "fs/promises";
import { join } from "path";
import { config } from "../core/config";
import logger from "../core/logger";

const paymentsRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

/**
 * GET /api/payments/:id
 * Get payment details by transaction ID
 * Requires authentication
 */
paymentsRoutes.get("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  try {
    const transaction = await paymentDomain.getPaymentById(id);
    return ResponseBuilder.success(c, transaction);
  } catch (error: any) {
    logger.error(
      {
        transactionId: id,
        error: error.message,
      },
      "Failed to fetch payment details"
    );
    return ResponseBuilder.error(c, error.message, 404);
  }
});

/**
 * GET /api/payments/history/:loanId
 * Get payment history for a loan with pagination
 * Query params: page (default: 1), limit (default: 10)
 * Requires authentication
 */
paymentsRoutes.get("/history/:loanId", authMiddleware, async (c) => {
  const loanId = c.req.param("loanId");
  const page = Number(c.req.query("page") || 1);
  const limit = Number(c.req.query("limit") || 10);

  try {
    const result = await paymentDomain.getPaymentHistory(loanId, page, limit);
    return ResponseBuilder.success(c, result);
  } catch (error: any) {
    logger.error(
      {
        loanId,
        page,
        limit,
        error: error.message,
      },
      "Failed to fetch payment history"
    );
    return ResponseBuilder.error(c, error.message, 404);
  }
});

/**
 * GET /api/payments/receipt/:id
 * Download receipt PDF for a transaction
 * Requires authentication
 */
paymentsRoutes.get("/receipt/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  try {
    // Get receipt path from transaction
    const receiptPath = await paymentDomain.getReceiptPath(id);

    // Construct full file path
    // receiptPath is stored as "receipts/2024/12/transaction-id.pdf"
    // We need to prepend the storage path
    const fullPath = join(config.payment.receiptStoragePath, receiptPath.replace("receipts/", ""));

    // Read file
    const fileBuffer = await readFile(fullPath);

    // Set headers for PDF download
    c.header("Content-Type", "application/pdf");
    c.header("Content-Disposition", `attachment; filename="receipt-${id}.pdf"`);

    logger.info(
      {
        transactionId: id,
        receiptPath,
      },
      "Receipt downloaded successfully"
    );

    return c.body(fileBuffer);
  } catch (error: any) {
    logger.error(
      {
        transactionId: id,
        error: error.message,
      },
      "Failed to download receipt"
    );

    if (error.code === "ENOENT") {
      return ResponseBuilder.error(c, "Receipt file not found", 404);
    }

    return ResponseBuilder.error(c, error.message, 500);
  }
});

export default paymentsRoutes;
