import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../core/database";
import { clients } from "../../core/database/schema/clients.schema";

export class ClientsRepository {
  async findAll(limit: number, offset: number, search?: string) {
    let query = db.select().from(clients).where(sql`${clients.deleted_at} IS NULL`);

    if (search) {
      query = db.select().from(clients).where(
        sql`${clients.deleted_at} IS NULL AND (
          ${clients.first_name} ILIKE ${`%${search}%`} OR
          ${clients.last_name} ILIKE ${`%${search}%`} OR
          ${clients.citizen_id} ILIKE ${`%${search}%`} OR
          ${clients.email} ILIKE ${`%${search}%`}
        )`
      );
    }

    return query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(clients.created_at));
  }

  async count(search?: string) {
    let query = db.select({ count: sql`COUNT(*)` }).from(clients).where(sql`${clients.deleted_at} IS NULL`);

    if (search) {
      query = db.select({ count: sql`COUNT(*)` }).from(clients).where(
        sql`${clients.deleted_at} IS NULL AND (
          ${clients.first_name} ILIKE ${`%${search}%`} OR
          ${clients.last_name} ILIKE ${`%${search}%`} OR
          ${clients.citizen_id} ILIKE ${`%${search}%`} OR
          ${clients.email} ILIKE ${`%${search}%`}
        )`
      );
    }

    const result = await query;
    return Number(result[0].count);
  }

  async findById(id: string) {
    const result = await db
      .select()
      .from(clients)
      .where(sql`${clients.id} = ${id} AND ${clients.deleted_at} IS NULL`)
      .limit(1);

    return result[0] || null;
  }

  async create(data: typeof clients.$inferInsert) {
    const result = await db.insert(clients).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<typeof clients.$inferInsert>) {
    const result = await db
      .update(clients)
      .set({ ...data, updated_at: new Date() })
      .where(eq(clients.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string) {
    const result = await db
      .update(clients)
      .set({ deleted_at: new Date() })
      .where(eq(clients.id, id))
      .returning();

    return result[0];
  }

  async findByLineUserId(lineUserId: string) {
    const result = await db
      .select()
      .from(clients)
      .where(
        sql`${clients.line_user_id} = ${lineUserId} AND ${clients.deleted_at} IS NULL`
      )
      .limit(1);

    return result[0] || null;
  }

  async updateLineProfile(
    clientId: string,
    lineProfile: {
      line_user_id: string;
      line_display_name: string;
      line_picture_url: string | null;
      connected_at: Date;
    }
  ) {
    const result = await db
      .update(clients)
      .set({
        ...lineProfile,
        updated_at: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning();

    return result[0];
  }

  async findAllWithConnectionStatus(
    limit: number,
    offset: number,
    connected?: boolean
  ) {
    let query = db
      .select()
      .from(clients)
      .where(sql`${clients.deleted_at} IS NULL`);

    if (connected !== undefined) {
      if (connected) {
        query = db
          .select()
          .from(clients)
          .where(
            sql`${clients.deleted_at} IS NULL AND ${clients.line_user_id} IS NOT NULL`
          );
      } else {
        query = db
          .select()
          .from(clients)
          .where(
            sql`${clients.deleted_at} IS NULL AND ${clients.line_user_id} IS NULL`
          );
      }
    }

    return query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(clients.created_at));
  }
}

export const clientsRepository = new ClientsRepository();
