import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../core/database";
import { loans } from "../../core/database/schema/loans.schema";
import { clients } from "../../core/database/schema/clients.schema";

export class LoansRepository {
  async findAll(limit: number, offset: number, search?: string) {
    let query = db.select({
      loan: loans,
      client: {
        first_name: clients.first_name,
        last_name: clients.last_name,
        citizen_id: clients.citizen_id,
      }
    })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(sql`${loans.deleted_at} IS NULL`);

    if (search) {
      query = db.select({
        loan: loans,
        client: {
          first_name: clients.first_name,
          last_name: clients.last_name,
          citizen_id: clients.citizen_id,
        }
      })
        .from(loans)
        .leftJoin(clients, eq(loans.client_id, clients.id))
        .where(
          sql`${loans.deleted_at} IS NULL AND (
          ${loans.contract_number} ILIKE ${`%${search}%`} OR
          ${clients.first_name} ILIKE ${`%${search}%`} OR
          ${clients.last_name} ILIKE ${`%${search}%`} OR
          ${clients.citizen_id} ILIKE ${`%${search}%`}
        )`
        );
    }

    return query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(loans.created_at));
  }

  async count(search?: string) {
    let query = db.select({ count: sql`COUNT(*)` })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(sql`${loans.deleted_at} IS NULL`);

    if (search) {
      query = db.select({ count: sql`COUNT(*)` })
        .from(loans)
        .leftJoin(clients, eq(loans.client_id, clients.id))
        .where(
          sql`${loans.deleted_at} IS NULL AND (
            ${loans.contract_number} ILIKE ${`%${search}%`} OR
            ${clients.first_name} ILIKE ${`%${search}%`} OR
            ${clients.last_name} ILIKE ${`%${search}%`} OR
            ${clients.citizen_id} ILIKE ${`%${search}%`}
          )`
        );
    }

    const result = await query;
    return Number(result[0].count);
  }

  async findById(id: string) {
    const result = await db
      .select({
        loan: loans,
        client: {
          first_name: clients.first_name,
          last_name: clients.last_name,
          citizen_id: clients.citizen_id,
        }
      })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(sql`${loans.id} = ${id} AND ${loans.deleted_at} IS NULL`)
      .limit(1);

    if (!result[0]) return null;

    return {
      ...result[0].loan,
      client: result[0].client
    };
  }

  async create(data: typeof loans.$inferInsert) {
    const result = await db.insert(loans).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<typeof loans.$inferInsert>) {
    const result = await db
      .update(loans)
      .set({ ...data, updated_at: new Date() })
      .where(eq(loans.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string) {
    const result = await db
      .update(loans)
      .set({ deleted_at: new Date() })
      .where(eq(loans.id, id))
      .returning();

    return result[0];
  }
}

export const loansRepository = new LoansRepository();
