import { loansRepository } from "./loans.repository";
import { loans } from "../../core/database/schema/loans.schema";
import { lineClient } from "../line/line.service";
import { createNewLoanMessage } from "../line/utils/flex-message.templates";
import { logger } from "../../core/logger";
import dayjs from "dayjs";
import type { LineReplyMessage } from "../line/line.types";

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
}

export const loansDomain = new LoansDomain();
