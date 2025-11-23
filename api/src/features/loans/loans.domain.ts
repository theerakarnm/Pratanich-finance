import { loansRepository } from "./loans.repository";
import { loans } from "../../core/database/schema/loans.schema";

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
    return loansRepository.create(data);
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
