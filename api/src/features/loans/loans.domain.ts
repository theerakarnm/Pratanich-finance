import { loansRepository } from "./loans.repository";
import { loans } from "../../core/database/schema/loans.schema";
import { lineClient } from "../line/line.service";
import { createNewLoanMessage } from "../line/utils/flex-message.templates";
import { logger } from "../../core/logger";
import { paymentRepository } from "../payments/payments.repository";
import dayjs from "dayjs";
import type { LineReplyMessage } from "../line/line.types";
import type { PaymentScheduleResponse, PaymentPeriod } from "./loans.interface";

export class LoansDomain {
  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const offset = (page - 1) * limit;
    const data = await loansRepository.findAll(limit, offset, search);
    const total = await loansRepository.count(search);

    return {
      data: data.map(item => ({
        ...item.loan,
        client: item.client
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const loan = await loansRepository.findById(id);
    if (!loan) {
      throw new Error("Loan contract not found");
    }
    return loan;
  }

  async create(data: typeof loans.$inferInsert) {
    const loan = await loansRepository.create(data);

    // Send LINE notification if client has LINE account
    try {
      const loanWithClient = await loansRepository.findById(loan.id);

      if (loanWithClient && loanWithClient.client && loanWithClient.client.line_user_id) {
        const flexMessage = createNewLoanMessage({
          contractNumber: loan.contract_number,
          principal: Number(loan.principal_amount),
          interestRate: Number(loan.interest_rate),
          term: loan.term_months,
          startDate: dayjs(loan.contract_start_date).format('DD/MM/YYYY'),
          dueDate: dayjs(loan.contract_end_date).format('DD/MM/YYYY'),
          installmentAmount: Number(loan.installment_amount),
          paymentLink: `https://liff.line.me/${process.env.LIFF_ID}/loans/${loan.id}`, // Example link
        });

        const message: LineReplyMessage = {
          type: 'flex',
          altText: 'สัญญาเงินกู้ฉบับใหม่',
          contents: flexMessage
        };

        await lineClient.pushMessage(loanWithClient.client.line_user_id, [message]);
        logger.info({ loanId: loan.id, lineUserId: loanWithClient.client.line_user_id }, 'Sent new loan notification to LINE');
      }
    } catch (error) {
      // Log error but don't fail the loan creation
      logger.error({ error, loanId: loan.id }, 'Failed to send new loan notification to LINE');
    }

    return loan;
  }

  async update(id: string, data: Partial<typeof loans.$inferInsert>) {
    const loan = await this.findById(id); // Ensure loan exists
    return loansRepository.update(id, data);
  }

  async delete(id: string) {
    const loan = await this.findById(id); // Ensure loan exists
    return loansRepository.delete(id);
  }

  /**
   * Get the payment history for a loan
   * Returns actual transactions made by the user
   */
  async calculatePaymentSchedule(id: string): Promise<PaymentScheduleResponse> {
    const loan = await loansRepository.findById(id);
    if (!loan) {
      throw new Error("Loan contract not found");
    }

    const principalAmount = Number(loan.principal_amount);
    const termMonths = loan.term_months;
    const installmentAmount = Number(loan.installment_amount);

    // Fetch actual transactions for this loan (limit to 1000 to be safe)
    const transactions = await paymentRepository.findPaymentHistory(id, 1000, 0);

    // Build payment history from actual transactions
    const schedule: PaymentPeriod[] = [];
    let accumulatedInterest = 0;

    // Sort transactions by payment date (oldest first) for correct period numbering
    const sortedTransactions = [...transactions].reverse();

    sortedTransactions.forEach((tx, index) => {
      const interestPaid = Number(tx.amount_to_interest);
      const principalPaid = Number(tx.amount_to_principal);
      const penaltyPaid = Number(tx.amount_to_penalties);
      const totalAmount = Number(tx.amount);

      accumulatedInterest += interestPaid;

      // Calculate beginning balance (balance after payment + principal paid in this transaction)
      const endingBalance = Number(tx.principal_remaining);
      const beginningBalance = endingBalance + principalPaid;

      schedule.push({
        periodNumber: index + 1,
        paymentDate: dayjs(tx.payment_date).format('YYYY-MM-DD'),
        beginningBalance: Math.round(beginningBalance * 100) / 100,
        scheduledPayment: Math.round(totalAmount * 100) / 100,
        principalPayment: Math.round(principalPaid * 100) / 100,
        interestPayment: Math.round(interestPaid * 100) / 100,
        endingBalance: Math.round(endingBalance * 100) / 100,
        accumulatedInterest: Math.round(accumulatedInterest * 100) / 100,
        isPaid: true,
        status: 'paid',
        penaltyPayment: penaltyPaid > 0 ? Math.round(penaltyPaid * 100) / 100 : undefined,
        paymentMethod: tx.payment_method ?? undefined,
        transactionRef: tx.transaction_ref_id ?? undefined,
      });
    });

    // Calculate summary from actual loan data
    const principalPaid = Number(loan.principal_paid);
    const interestPaid = Number(loan.interest_paid);
    const totalPaid = principalPaid + interestPaid;
    const completedPayments = schedule.length;

    // Estimate remaining payments based on outstanding balance and installment amount
    const outstandingBalance = Number(loan.outstanding_balance);
    const remainingPayments = installmentAmount > 0
      ? Math.ceil(outstandingBalance / installmentAmount)
      : termMonths - completedPayments;

    // Build client name
    const clientName = loan.client
      ? `${loan.client.first_name} ${loan.client.last_name}`
      : '-';

    return {
      loanDetails: {
        id: loan.id,
        contractNumber: loan.contract_number,
        clientName,
        loanType: loan.loan_type,
        principalAmount,
        approvedAmount: Number(loan.approved_amount),
        interestRate: Number(loan.interest_rate),
        termMonths,
        installmentAmount,
        contractStartDate: dayjs(loan.contract_start_date).format('YYYY-MM-DD'),
        contractEndDate: dayjs(loan.contract_end_date).format('YYYY-MM-DD'),
        dueDay: loan.due_day,
        contractStatus: loan.contract_status,
        outstandingBalance: Number(loan.outstanding_balance),
        principalPaid: Number(loan.principal_paid),
        interestPaid: Number(loan.interest_paid),
        totalPenalties: Number(loan.total_penalties),
        penaltiesPaid: Number(loan.penalties_paid),
        overduedays: loan.overdue_days,
      },
      summary: {
        totalPaymentAmount: Math.round(totalPaid * 100) / 100,
        totalInterest: Math.round(interestPaid * 100) / 100,
        totalPrincipal: principalPaid,
        remainingPayments: Math.max(0, remainingPayments),
        completedPayments,
      },
      schedule,
    };
  }
}

export const loansDomain = new LoansDomain();

