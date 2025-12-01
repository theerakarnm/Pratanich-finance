import { eq, and, sql } from "drizzle-orm";
import { db } from "../../core/database";
import { loans, clients, connectCodes } from "../../core/database/schema";
import { PaymentMatchingError } from "./payments.errors";

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
    // Strategy 1: Extract contract number from sender info
    const contractNumber = this.extractContractNumber(
      slipokData.sender.displayName || ""
    );
    
    if (contractNumber) {
      const loan = await this.findByContractNumber(contractNumber);
      if (loan) {
        return loan;
      }
    }

    // Strategy 2: Match by LINE user ID
    if (lineUserId) {
      const loan = await this.findByLineUserId(lineUserId);
      if (loan) {
        return loan;
      }
    }

    // Strategy 3: Match by bank account number
    const senderAccount = slipokData.sender.account?.value;
    if (senderAccount) {
      const loans = await this.findByBankAccount(senderAccount);
      
      if (loans.length === 1) {
        return loans[0];
      } else if (loans.length > 1) {
        throw new PaymentMatchingError(
          `Multiple active loans found for bank account ${senderAccount}. Manual matching required.`,
          slipokData
        );
      }
    }

    // No match found
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

    // Pattern 1: "Contract: XXX" or "สัญญา: XXX" or "สัญญาเลขที่ XXX"
    const pattern1 = /(?:contract|สัญญา)[\s:：เลขที่]*([A-Z0-9-]+)/i;
    const match1 = text.match(pattern1);
    if (match1) {
      return match1[1].toUpperCase();
    }

    // Pattern 2: "#XXX" format
    const pattern2 = /#([A-Z0-9-]+)/i;
    const match2 = text.match(pattern2);
    if (match2) {
      return match2[1].toUpperCase();
    }

    // Pattern 3: Standalone alphanumeric code (at least 5 characters)
    const pattern3 = /\b([A-Z0-9]{5,})\b/i;
    const match3 = text.match(pattern3);
    if (match3) {
      return match3[1].toUpperCase();
    }

    return null;
  }

  /**
   * Find loan by contract number
   */
  private async findByContractNumber(
    contractNumber: string
  ): Promise<typeof loans.$inferSelect | null> {
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

    return result[0] || null;
  }

  /**
   * Find loan by LINE user ID
   * Joins through clients table to find active loans for the connected client
   */
  private async findByLineUserId(
    lineUserId: string
  ): Promise<typeof loans.$inferSelect | null> {
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

    return result[0]?.loan || null;
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
