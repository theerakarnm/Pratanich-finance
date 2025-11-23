import { clientsRepository } from "./clients.repository";
import { clients } from "../../core/database/schema/clients.schema";
import { loansRepository } from "../loans/loans.repository";

export class ClientsDomain {
  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const offset = (page - 1) * limit;
    const data = await clientsRepository.findAll(limit, offset, search);
    const total = await clientsRepository.count(search);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new Error("Client not found");
    }
    return client;
  }

  async create(data: typeof clients.$inferInsert) {
    return clientsRepository.create(data);
  }

  async update(id: string, data: Partial<typeof clients.$inferInsert>) {
    const client = await this.findById(id); // Ensure client exists
    return clientsRepository.update(id, data);
  }

  async delete(id: string) {
    const client = await this.findById(id); // Ensure client exists
    return clientsRepository.delete(id);
  }

  async getConnectionStatus(clientId: string) {
    const client = await this.findById(clientId);
    
    return {
      isConnected: !!client.line_user_id,
      lineUserId: client.line_user_id,
      lineDisplayName: client.line_display_name,
      linePictureUrl: client.line_picture_url,
      connectedAt: client.connected_at,
    };
  }

  async getLoansSummary(clientId: string) {
    // Ensure client exists
    await this.findById(clientId);
    
    // Get all loans for the client
    const clientLoans = await loansRepository.findByClientId(clientId);
    
    // Calculate total outstanding balance
    const totalOutstanding = clientLoans.reduce((sum, loan) => {
      return sum + Number(loan.outstanding_balance);
    }, 0);
    
    // Format loan data
    const loans = clientLoans.map(loan => ({
      id: loan.id,
      contractNumber: loan.contract_number,
      loanType: loan.loan_type,
      principalAmount: loan.principal_amount,
      outstandingBalance: loan.outstanding_balance,
      contractStatus: loan.contract_status,
      contractStartDate: loan.contract_start_date,
      contractEndDate: loan.contract_end_date,
      dueDay: loan.due_day,
      overduedays: loan.overdue_days,
    }));
    
    return {
      loans,
      totalLoans: loans.length,
      totalOutstanding: totalOutstanding.toFixed(2),
    };
  }
}

export const clientsDomain = new ClientsDomain();
