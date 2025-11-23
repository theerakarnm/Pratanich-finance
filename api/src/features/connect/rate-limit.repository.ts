import { eq, and, lt } from "drizzle-orm";
import { db } from "../../core/database";
import { connectRateLimit } from "../../core/database/schema/connect-codes.schema";

export class RateLimitRepository {
  async getOrCreate(clientId: string) {
    // Try to find existing rate limit record
    const existing = await db
      .select()
      .from(connectRateLimit)
      .where(eq(connectRateLimit.client_id, clientId))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    // Create new rate limit record
    const result = await db
      .insert(connectRateLimit)
      .values({
        client_id: clientId,
        attempt_count: 0,
        window_start: new Date(),
      })
      .returning();

    return result[0];
  }

  async incrementAttempts(clientId: string) {
    const record = await this.getOrCreate(clientId);

    const result = await db
      .update(connectRateLimit)
      .set({
        attempt_count: record.attempt_count + 1,
      })
      .where(eq(connectRateLimit.client_id, clientId))
      .returning();

    return result[0];
  }

  async reset(clientId: string) {
    await db
      .update(connectRateLimit)
      .set({
        attempt_count: 0,
        window_start: new Date(),
        blocked_until: null,
      })
      .where(eq(connectRateLimit.client_id, clientId));
  }

  async blockClient(clientId: string, durationMinutes: number) {
    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + durationMinutes);

    await db
      .update(connectRateLimit)
      .set({
        blocked_until: blockedUntil,
      })
      .where(eq(connectRateLimit.client_id, clientId));
  }

  async cleanupExpired() {
    const now = new Date();
    
    // Delete records where blocked_until has passed and can be cleaned up
    const result = await db
      .delete(connectRateLimit)
      .where(
        and(
          lt(connectRateLimit.blocked_until, now)
        )
      )
      .returning();

    return result.length;
  }
}

export const rateLimitRepository = new RateLimitRepository();
