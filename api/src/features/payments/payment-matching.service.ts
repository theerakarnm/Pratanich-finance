import { eq, and, sql } from "drizzle-orm";
import { db } from "../../core/database";
import { loans, clients } from "../../core/database/schema";
import { PaymentMatchingError } from "./payments.errors";
import logger from "../../core/logger";

/**
 * SlipOK webhook payload structure
 */
export interface SlipOKWebhookPayload {
  transRef: string;
  sendingBank: string;
  receivingBank: string;
  transDate: string;
  transTime: string;
  amount: number;
  sender: {
    displayName: string;
    name?: string;
    account?: {
      value: string;
    };
  };
  receiver: {
    displayName: string;
    name?: string;
    account?: {
      value: string;
    };
  };
  success: boolean;
  message?: string;
}

/**
 * Service for matching incoming payments to loan contracts
 */
export class PaymentMatchingService {
  /**
   * Find loan contract for a payment using multiple matching strategies
   * 
   * Strategies (in order):
   * 1. Extract contract number from sender info/notes
   * 2. Match by client's LINE user ID (via connect_codes table)
   * 3. Match by client's bank account number
   * 
   * @throws PaymentMatchingError if no match or multiple matches found
   */
  async findLoanForPayment(
    slipokData: SlipOKWebhookPayload,
    lineUserId?: string
  ): Promise<typeof loans.$inferSelect> {
    logger.info(
      {
        transRef: slipokData.transRef,
        amount: slipokData.amount,
        senderDisplayName: slipokData.sender.displayName,
        lineUserId,
      },
      "Starting payment matching process"
    );

    // Strategy 1: Extract contract number from sender info
    logger.info(
      { transRef: slipokData.transRef },
      "Attempting Strategy 1: Extract contract number from sender info"
    );

    const contractNumber = this.extractContractNumber(
      slipokData.sender.displayName || ""
    );
    
    if (contractNumber) {
      logger.info(
        { transRef: slipokData.transRef, contractNumber },
        "Contract number extracted from sender info"
      );

      const loan = await this.findByContractNumber(contractNumber);
      if (loan) {
        logger.info(
          {
            transRef: slipokData.transRef,
            loanId: loan.id,
            contractNumber: loan.contract_number,
            strategy: "contract_number_extraction",
          },
          "Payment matched successfully via Strategy 1"
        );
        return loan;
      } else {
        logger.warn(
          { transRef: slipokData.transRef, contractNumber },
          "Contract number extracted but no matching loan found"
        );
      }
    } else {
      logger.info(
        { transRef: slipokData.transRef },
        "No contract number found in sender info"
      );
    }

    // Strategy 2: Match by LINE user ID
    if (lineUserId) {
      logger.info(
        { transRef: slipokData.transRef, lineUserId },
        "Attempting Strategy 2: Match by LINE user ID"
      );

      const loan = await this.findByLineUserId(lineUserId);
      if (loan) {
        logger.info(
          {
            transRef: slipokData.transRef,
            loanId: loan.id,
            contractNumber: loan.contract_number,
            lineUserId,
            strategy: "line_user_id",
          },
          "Payment matched successfully via Strategy 2"
        );
        return loan;
      } else {
        logger.warn(
          { transRef: slipokData.transRef, lineUserId },
          "No active loan found for LINE user ID"
        );
      }
    } else {
      logger.info(
        { transRef: slipokData.transRef },
        "No LINE user ID provided, skipping Strategy 2"
      );
    }

    // Strategy 3: Match by bank account number
    const senderAccount = slipokData.sender.account?.value;
    if (senderAccount) {
      logger.info(
        { transRef: slipokData.transRef, senderAccount },
        "Attempting Strategy 3: Match by bank account number"
      );

      const loans = await this.findByBankAccount(senderAccount);
      
      if (loans.length === 1) {
        logger.info(
          {
            transRef: slipokData.transRef,
            loanId: loans[0].id,
            contractNumber: loans[0].contract_number,
            senderAccount,
            strategy: "bank_account",
          },
          "Payment matched successfully via Strategy 3"
        );
        return loans[0];
      } else if (loans.length > 1) {
        logger.error(
          {
            transRef: slipokData.transRef,
            senderAccount,
            matchCount: loans.length,
            loanIds: loans.map(l => l.id),
          },
          "Multiple active loans found for bank account - ambiguous match"
        );
        throw new PaymentMatchingError(
          `Multiple active loans found for bank account ${senderAccount}. Manual matching required.`,
          slipokData
        );
      } else {
        logger.warn(
          { transRef: slipokData.transRef, senderAccount },
          "No active loan found for bank account"
        );
      }
    } else {
      logger.info(
        { transRef: slipokData.transRef },
        "No sender account provided, skipping Strategy 3"
      );
    }

    // No match found
    logger.error(
      {
        transRef: slipokData.transRef,
        amount: slipokData.amount,
        senderDisplayName: slipokData.sender.displayName,
        senderAccount,
        lineUserId,
      },
      "Payment matching failed - no matching loan found via any strategy"
    );

    throw new PaymentMatchingError(
      "Unable to match payment to any loan contract. Manual matching required.",
      slipokData
    );
  }

  /**
   * Extract contract number from payment notes/reference text
   * Looks for patterns like: "Contract: ABC123", "สัญญา ABC123", "#ABC123"
   */
  private extractContractNumber(text: string): string | null {
    if (!text) return null;

    logger.info(
      { text },
      "Attempting to extract contract number from text"
    );

    // Pattern 1: "Contract: XXX" or "สัญญา: XXX" or "สัญญาเลขที่ XXX"
    const pattern1 = /(?:contract|สัญญา)[\s:：เลขที่]*([A-Z0-9-]+)/i;
    const match1 = text.match(pattern1);
    if (match1) {
      const contractNumber = match1[1].toUpperCase();
      logger.info(
        { text, contractNumber, pattern: "contract_keyword" },
        "Contract number extracted using Pattern 1"
      );
      return contractNumber;
    }

    // Pattern 2: "#XXX" format
    const pattern2 = /#([A-Z0-9-]+)/i;
    const match2 = text.match(pattern2);
    if (match2) {
      const contractNumber = match2[1].toUpperCase();
      logger.info(
        { text, contractNumber, pattern: "hashtag" },
        "Contract number extracted using Pattern 2"
      );
      return contractNumber;
    }

    // Pattern 3: Standalone alphanumeric code (at least 5 characters)
    const pattern3 = /\b([A-Z0-9]{5,})\b/i;
    const match3 = text.match(pattern3);
    if (match3) {
      const contractNumber = match3[1].toUpperCase();
      logger.info(
        { text, contractNumber, pattern: "standalone_code" },
        "Contract number extracted using Pattern 3"
      );
      return contractNumber;
    }

    logger.info(
      { text },
      "No contract number pattern matched"
    );

    return null;
  }

  /**
   * Find loan by contract number
   */
  private async findByContractNumber(
    contractNumber: string
  ): Promise<typeof loans.$inferSelect | null> {
    logger.info(
      { contractNumber },
      "Querying database for loan by contract number"
    );

    const result = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.contract_number, contractNumber),
          sql`${loans.deleted_at} IS NULL`,
          sql`${loans.contract_status} != 'Closed'`
        )
      )
      .limit(1);

    const loan = result[0] || null;

    if (loan) {
      logger.info(
        { contractNumber, loanId: loan.id, status: loan.contract_status },
        "Loan found by contract number"
      );
    } else {
      logger.info(
        { contractNumber },
        "No active loan found for contract number"
      );
    }

    return loan;
  }

  /**
   * Find loan by LINE user ID
   * Joins through clients table to find active loans for the connected client
   */
  private async findByLineUserId(
    lineUserId: string
  ): Promise<typeof loans.$inferSelect | null> {
    logger.info(
      { lineUserId },
      "Querying database for loan by LINE user ID"
    );

    const result = await db
      .select({ loan: loans })
      .from(clients)
      .innerJoin(loans, eq(clients.id, loans.client_id))
      .where(
        and(
          eq(clients.line_user_id, lineUserId),
          sql`${clients.deleted_at} IS NULL`,
          sql`${loans.deleted_at} IS NULL`,
          sql`${loans.contract_status} != 'Closed'`
        )
      )
      .orderBy(sql`${loans.created_at} DESC`)
      .limit(1);

    const loan = result[0]?.loan || null;

    if (loan) {
      logger.info(
        {
          lineUserId,
          loanId: loan.id,
          contractNumber: loan.contract_number,
          status: loan.contract_status,
        },
        "Loan found by LINE user ID"
      );
    } else {
      logger.info(
        { lineUserId },
        "No active loan found for LINE user ID"
      );
    }

    return loan;
  }

  /**
   * Find loans by bank account number
   * Note: This strategy is currently not implemented as the clients schema
   * doesn't have a bank_account field. If needed in the future, the clients
   * schema should be extended to include bank account information.
   * 
   * Returns array to detect multiple matches
   */
  private async findByBankAccount(
    bankAccount: string
  ): Promise<Array<typeof loans.$inferSelect>> {
    // Strategy not available - clients schema doesn't have bank_account field
    // If this strategy is needed, add bank_account field to clients schema
    // and implement the query below:
    
    // const result = await db
    //   .select({ loan: loans })
    //   .from(clients)
    //   .innerJoin(loans, eq(clients.id, loans.client_id))
    //   .where(
    //     and(
    //       eq(clients.bank_account, bankAccount),
    //       sql`${clients.deleted_at} IS NULL`,
    //       sql`${loans.deleted_at} IS NULL`,
    //       sql`${loans.contract_status} != 'Closed'`
    //     )
    //   );
    // return result.map(r => r.loan);
    
    return [];
  }
}

export const paymentMatchingService = new PaymentMatchingService();
