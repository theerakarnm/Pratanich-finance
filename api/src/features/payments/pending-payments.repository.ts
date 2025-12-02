import { db } from '../../core/database';
import { pendingPayments } from '../../core/database/schema/pending-payments.schema';
import { loans } from '../../core/database/schema/loans.schema';
import { clients } from '../../core/database/schema/clients.schema';
import { eq, desc } from 'drizzle-orm';
import type { PendingPaymentInsert } from './payments.types';

export class PendingPaymentsRepository {
  /**
   * Create a pending payment record for unmatched payments
   */
  async create(data: PendingPaymentInsert) {
    const [pendingPayment] = await db
      .insert(pendingPayments)
      .values(data)
      .returning();
    
    return pendingPayment;
  }

  /**
   * Find pending payment by transaction reference ID
   */
  async findByTransactionRef(transactionRefId: string) {
    const [pendingPayment] = await db
      .select()
      .from(pendingPayments)
      .where(eq(pendingPayments.transaction_ref_id, transactionRefId))
      .limit(1);
    
    return pendingPayment || null;
  }

  /**
   * Find pending payment by ID
   */
  async findById(id: string) {
    const [pendingPayment] = await db
      .select()
      .from(pendingPayments)
      .where(eq(pendingPayments.id, id))
      .limit(1);
    
    return pendingPayment || null;
  }

  /**
   * Find pending payment by ID with loan and client details
   */
  async findByIdWithDetails(id: string) {
    const [result] = await db
      .select({
        pendingPayment: pendingPayments,
        loan: loans,
        client: clients,
      })
      .from(pendingPayments)
      .leftJoin(loans, eq(pendingPayments.matched_loan_id, loans.id))
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(eq(pendingPayments.id, id))
      .limit(1);
    
    return result || null;
  }

  /**
   * Get all unmatched pending payments
   */
  async findUnmatched() {
    return db
      .select()
      .from(pendingPayments)
      .where(eq(pendingPayments.status, 'Unmatched'))
      .orderBy(desc(pendingPayments.created_at));
  }

  /**
   * Get all pending payments (any status)
   */
  async findAll() {
    return db
      .select()
      .from(pendingPayments)
      .orderBy(desc(pendingPayments.created_at));
  }

  /**
   * Update pending payment status and matched loan
   */
  async updateMatch(id: string, loanId: string, matchedBy: string, adminNotes?: string) {
    const [updated] = await db
      .update(pendingPayments)
      .set({
        status: 'Matched',
        matched_loan_id: loanId,
        matched_by: matchedBy,
        matched_at: new Date(),
        admin_notes: adminNotes,
        updated_at: new Date(),
      })
      .where(eq(pendingPayments.id, id))
      .returning();
    
    return updated;
  }

  /**
   * Mark pending payment as processed
   */
  async markProcessed(id: string, transactionId: string) {
    const [updated] = await db
      .update(pendingPayments)
      .set({
        status: 'Processed',
        processed_transaction_id: transactionId,
        processed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(pendingPayments.id, id))
      .returning();
    
    return updated;
  }

  /**
   * Mark pending payment as rejected
   */
  async markRejected(id: string, adminNotes: string) {
    const [updated] = await db
      .update(pendingPayments)
      .set({
        status: 'Rejected',
        admin_notes: adminNotes,
        updated_at: new Date(),
      })
      .where(eq(pendingPayments.id, id))
      .returning();
    
    return updated;
  }

  /**
   * Update admin notes
   */
  async updateNotes(id: string, adminNotes: string) {
    const [updated] = await db
      .update(pendingPayments)
      .set({
        admin_notes: adminNotes,
        updated_at: new Date(),
      })
      .where(eq(pendingPayments.id, id))
      .returning();
    
    return updated;
  }
}
