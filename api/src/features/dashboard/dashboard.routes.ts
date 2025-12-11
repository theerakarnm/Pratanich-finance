import { Hono } from "hono";
import { clientsRepository } from "../clients/clients.repository";
import { loansRepository } from "../loans/loans.repository";
import { paymentRepository } from "../payments/payments.repository";
import { ResponseBuilder } from "../../core/response";
import logger from "../../core/logger";

const dashboardRoutes = new Hono();

/**
 * GET /api/dashboard/stats
 * Returns aggregated dashboard statistics
 */
dashboardRoutes.get("/stats", async (c) => {
  try {
    const [
      totalClients,
      totalLoans,
      outstandingBalance,
      todayTransactions,
      loanTrends,
      transactionVolume,
    ] = await Promise.all([
      clientsRepository.count(),
      loansRepository.count(),
      loansRepository.sumOutstandingBalance(),
      paymentRepository.countTodayTransactions(),
      loansRepository.getLoanTrends(),
      paymentRepository.getTransactionVolume(),
    ]);

    logger.info(
      {
        totalClients,
        totalLoans,
        outstandingBalance,
        todayTransactions,
      },
      "Dashboard stats fetched"
    );

    return ResponseBuilder.success(c, {
      totalClients,
      totalLoans,
      outstandingBalance,
      todayTransactions,
      loanTrends,
      transactionVolume,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Failed to fetch dashboard stats"
    );
    return ResponseBuilder.error(c, "Failed to fetch dashboard stats", 500);
  }
});

export default dashboardRoutes;
