import { config } from '../../core/config';
import { db } from '../../core/database';
import { slipokLogs } from '../../core/database/schema';
import { desc, sql, or, ilike } from 'drizzle-orm';

interface VerifySlipParams {
  data?: string;
  files?: string; // base64
  url?: string;
  amount?: number;
  log?: boolean;
}

interface FindAllParams {
  page?: number;
  limit?: number;
  search?: string;
}

export class SlipOKService {
  private static getHeaders() {
    return {
      'x-authorization': config.slipok.apiKey,
      'Content-Type': 'application/json',
    };
  }

  static async verifySlip(params: VerifySlipParams) {
    const url = `${config.slipok.apiUrl}/${config.slipok.branchId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    const result = await response.json() as any;

    if (process.env.NODE_ENV === 'production' && !response.ok) { // production for testing duplicate slip
      throw new Error(result.message || 'Failed to verify slip');
    }

    // Save log to database
    if (result.success && result.data && result.data.success) {
      try {
        await db.insert(slipokLogs).values({
          transRef: result.data.transRef,
          sendingBank: result.data.sendingBank,
          receivingBank: result.data.receivingBank,
          transDate: result.data.transDate,
          transTime: result.data.transTime,
          amount: result.data.amount.toString(),
          sender: result.data.sender,
          receiver: result.data.receiver,
          success: result.data.success,
          message: result.data.message,
        });
      } catch (error) {
        console.error('Failed to save slipok log:', error);
      }
    }

    return result;
  }

  static async getQuota() {
    const url = `${config.slipok.apiUrl}/${config.slipok.branchId}/quota`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const result = await response.json() as any;

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get quota');
    }

    return result;
  }

  static async findAll(params: FindAllParams = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    const search = params.search?.trim() || '';

    // Build where conditions for search
    let whereConditions;
    if (search) {
      whereConditions = or(
        ilike(slipokLogs.transRef, `%${search}%`),
        sql`${slipokLogs.sender}->>'name' ILIKE ${`%${search}%`}`,
        sql`${slipokLogs.sender}->>'displayName' ILIKE ${`%${search}%`}`,
        sql`CAST(${slipokLogs.amount} AS TEXT) LIKE ${`%${search}%`}`
      );
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(slipokLogs)
      .where(whereConditions);
    const total = Number(countResult[0]?.count || 0);

    // Get paginated data
    const data = await db
      .select()
      .from(slipokLogs)
      .where(whereConditions)
      .orderBy(desc(slipokLogs.created_at))
      .limit(limit)
      .offset(offset);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

