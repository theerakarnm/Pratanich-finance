import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { auth } from "../libs/auth";
import { ResponseBuilder } from "../core/response";
import { readFile, access } from "fs/promises";
import { join, resolve } from "path";
import { config } from "../core/config";
import logger from "../core/logger";
import { constants } from "fs";

const receiptsRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

/**
 * GET /api/receipts/:year/:month/:filename
 * Get receipt PDF by path
 * Requires authentication
 */
receiptsRoutes.get("/:year/:month/:filename", authMiddleware, async (c) => {
  const year = c.req.param("year");
  const month = c.req.param("month");
  const filename = c.req.param("filename");

  // Basic validation to prevent directory traversal
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^[\w\-. ]+\.pdf$/i.test(filename)) {
    return ResponseBuilder.error(c, "Invalid parameters", 400);
  }

  try {
    // Construct full file path
    // config.payment.receiptStoragePath should be the base "uploads/receipts" directory
    // We assume the structure is uploads/receipts/YYYY/MM/filename.pdf
    const relativePath = join(year, month, filename);
    const fullPath = resolve(config.payment.receiptStoragePath, relativePath);

    // Security check: Ensure the resolved path is still within the storage directory
    const storageRoot = resolve(config.payment.receiptStoragePath);
    if (!fullPath.startsWith(storageRoot)) {
      return ResponseBuilder.error(c, "Access denied", 403);
    }

    // Check if file exists
    try {
      await access(fullPath, constants.F_OK);
    } catch {
      return ResponseBuilder.error(c, "Receipt file not found", 404);
    }

    // Read file
    const fileBuffer = await readFile(fullPath);

    // Set headers for PDF download/view
    c.header("Content-Type", "application/pdf");
    // Inline allows viewing in browser, attachment forces download. 
    // Usually for receipts, inline is better for preview, but let's stick to a safe default or what was requested.
    // The user didn't specify, but "get receipt" usually implies viewing or downloading.
    c.header("Content-Disposition", `inline; filename="${filename}"`);

    logger.info(
      {
        path: relativePath,
        user: c.get("user")?.id
      },
      "Receipt accessed successfully"
    );

    return c.body(fileBuffer);
  } catch (error: any) {
    logger.error(
      {
        year,
        month,
        filename,
        error: error.message,
      },
      "Failed to access receipt"
    );

    return ResponseBuilder.error(c, "Internal server error", 500);
  }
});

export default receiptsRoutes;
