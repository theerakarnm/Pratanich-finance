import { clientsRepository } from "./clients.repository";
import { clients } from "../../core/database/schema/clients.schema";

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
}

export const clientsDomain = new ClientsDomain();
