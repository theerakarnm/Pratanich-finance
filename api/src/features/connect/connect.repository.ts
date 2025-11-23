import { eq, and, lt } from "drizzle-orm";
import { db } from "../../core/database";
import { connectCodes } from "../../core/database/schema/connect-codes.schema";

export class ConnectRepository {
  async create(data: typeof connectCodes.$inferInsert) {
    const result = await db.insert(connectCodes).values(data).returning();
    return result[0];
  }

  async findByCode(code: string) {
    const result = await db
      .select()
      .from(connectCodes)
      .where(eq(connectCodes.code, code))
      .limit(1);

    return result[0] || null;
  }

  async findByClientId(clientId: string) {
    const result = await db
      .select()
      .from(connectCodes)
      .where(eq(connectCodes.client_id, clientId));

    return result;
  }

  async markAsUsed(code: string) {
    // Use transaction to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // First, check if code is already used
      const existing = await tx
        .select()
        .from(connectCodes)
        .where(eq(connectCodes.code, code))
        .limit(1);

      if (!existing[0]) {
        throw new Error("Connect code not found");
      }

      if (existing[0].is_used) {
        throw new Error("Connect code already used");
      }

      // Mark as used
      const updated = await tx
        .update(connectCodes)
        .set({
          is_used: true,
          used_at: new Date(),
        })
        .where(eq(connectCodes.code, code))
        .returning();

      return updated[0];
    });

    return result;
  }

  async delete(code: string) {
    await db.delete(connectCodes).where(eq(connectCodes.code, code));
  }

  async deleteExpired() {
    const now = new Date();
    const result = await db
      .delete(connectCodes)
      .where(
        and(
          lt(connectCodes.expires_at, now),
          eq(connectCodes.is_used, false)
        )
      )
      .returning();

    return result.length;
  }
}

export const connectRepository = new ConnectRepository();
