import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { db } from "../../core/database";
import { loans } from "../../core/database/schema/loans.schema";
import { clients } from "../../core/database/schema/clients.schema";
import type { LoanWithClient } from "../notifications/notification.types";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export class LoansRepository {
  private getSearchWhereClause(search?: string) {
    if (!search) return sql`${loans.deleted_at} IS NULL`;

    return sql`${loans.deleted_at} IS NULL AND (
      ${loans.contract_number} ILIKE ${`%${search}%`} OR
      ${clients.first_name} ILIKE ${`%${search}%`} OR
      ${clients.last_name} ILIKE ${`%${search}%`} OR
      ${clients.citizen_id} ILIKE ${`%${search}%`} OR
      ${clients.mobile_number} ILIKE ${`%${search}%`}
    )`;
  }

  async findAll(limit: number, offset: number, search?: string) {
    const whereClause = this.getSearchWhereClause(search);

    return db.select({
      loan: loans,
      client: {
        first_name: clients.first_name,
        last_name: clients.last_name,
        citizen_id: clients.citizen_id,
      }
    })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(loans.created_at));
  }

  async count(search?: string) {
    const whereClause = this.getSearchWhereClause(search);

    const result = await db.select({ count: sql`COUNT(*)` })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(whereClause);

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
          line_user_id: clients.line_user_id,
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

  async findByClientId(clientId: string) {
    const result = await db
      .select()
      .from(loans)
      .where(
        sql`${loans.client_id} = ${clientId} AND ${loans.deleted_at} IS NULL`
      )
      .orderBy(desc(loans.created_at));

    return result;
  }

  async findByClientAndContractNumber(clientId: string, contractNumber: string) {
    const result = await db
      .select()
      .from(loans)
      .where(
        sql`${loans.client_id} = ${clientId} AND ${loans.contract_number} = ${contractNumber} AND ${loans.deleted_at} IS NULL`
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find loans requiring billing notification (15 days before due date)
   * Filters for Active or Overdue status
   * 
   * @returns Array of loans with client information
   */
  async findLoansForBillingNotification(): Promise<LoanWithClient[]> {
    const today = dayjs().tz("Asia/Bangkok");
    const targetDate = today.add(15, "days");
    const targetDay = targetDate.date();

    const result = await db
      .select({
        id: loans.id,
        contract_number: loans.contract_number,
        client_id: loans.client_id,
        outstanding_balance: loans.outstanding_balance,
        installment_amount: loans.installment_amount,
        due_day: loans.due_day,
        contract_status: loans.contract_status,
        overdue_days: loans.overdue_days,
        interest_rate: loans.interest_rate,
        term_months: loans.term_months,
        contract_start_date: loans.contract_start_date,
        total_penalties: loans.total_penalties,
        client_name: sql<string>`CONCAT(${clients.first_name}, ' ', ${clients.last_name})`,
        client_phone: clients.mobile_number,
      })
      .from(loans)
      .innerJoin(clients, eq(loans.client_id, clients.id))
      .where(
        and(
          sql`${loans.deleted_at} IS NULL`,
          sql`${clients.deleted_at} IS NULL`,
          sql`${loans.due_day} = ${targetDay}`,
          inArray(loans.contract_status, ["Active", "Overdue"])
        )
      );

    return result.map(row => ({
      ...row,
      contract_start_date: dayjs(row.contract_start_date).toISOString(),
    }));
  }

  /**
   * Find loans requiring warning notification (3 days before due date)
   * Filters for Active or Overdue status and outstanding balance > 0
   * 
   * @returns Array of loans with client information
   */
  async findLoansForWarningNotification(): Promise<LoanWithClient[]> {
    const today = dayjs().tz("Asia/Bangkok");
    const targetDate = today.add(3, "days");
    const targetDay = targetDate.date();

    const result = await db
      .select({
        id: loans.id,
        contract_number: loans.contract_number,
        client_id: loans.client_id,
        outstanding_balance: loans.outstanding_balance,
        installment_amount: loans.installment_amount,
        due_day: loans.due_day,
        contract_status: loans.contract_status,
        overdue_days: loans.overdue_days,
        interest_rate: loans.interest_rate,
        term_months: loans.term_months,
        contract_start_date: loans.contract_start_date,
        total_penalties: loans.total_penalties,
        client_name: sql<string>`CONCAT(${clients.first_name}, ' ', ${clients.last_name})`,
        client_phone: clients.mobile_number,
      })
      .from(loans)
      .innerJoin(clients, eq(loans.client_id, clients.id))
      .where(
        and(
          sql`${loans.deleted_at} IS NULL`,
          sql`${clients.deleted_at} IS NULL`,
          sql`${loans.due_day} = ${targetDay}`,
          inArray(loans.contract_status, ["Active", "Overdue"]),
          sql`${loans.outstanding_balance}::numeric > 0`
        )
      );

    return result.map(row => ({
      ...row,
      contract_start_date: dayjs(row.contract_start_date).toISOString(),
    }));
  }

  /**
   * Find loans requiring due date notification (on due date)
   * Filters for Active or Overdue status and outstanding balance > 0
   * 
   * @returns Array of loans with client information
   */
  async findLoansForDueDateNotification(): Promise<LoanWithClient[]> {
    const today = dayjs().tz("Asia/Bangkok");
    const todayDay = today.date();

    const result = await db
      .select({
        id: loans.id,
        contract_number: loans.contract_number,
        client_id: loans.client_id,
        outstanding_balance: loans.outstanding_balance,
        installment_amount: loans.installment_amount,
        due_day: loans.due_day,
        contract_status: loans.contract_status,
        overdue_days: loans.overdue_days,
        interest_rate: loans.interest_rate,
        term_months: loans.term_months,
        contract_start_date: loans.contract_start_date,
        total_penalties: loans.total_penalties,
        client_name: sql<string>`CONCAT(${clients.first_name}, ' ', ${clients.last_name})`,
        client_phone: clients.mobile_number,
      })
      .from(loans)
      .innerJoin(clients, eq(loans.client_id, clients.id))
      .where(
        and(
          sql`${loans.deleted_at} IS NULL`,
          sql`${clients.deleted_at} IS NULL`,
          sql`${loans.due_day} = ${todayDay}`,
          inArray(loans.contract_status, ["Active", "Overdue"]),
          sql`${loans.outstanding_balance}::numeric > 0`
        )
      );

    return result.map(row => ({
      ...row,
      contract_start_date: dayjs(row.contract_start_date).toISOString(),
    }));
  }

  /**
   * Find loans requiring overdue notification (after due date)
   * Filters for Overdue status and days overdue equal to 1, 3, or 7
   * 
   * @returns Array of loans with client information
   */
  async findLoansForOverdueNotification(): Promise<LoanWithClient[]> {
    const result = await db
      .select({
        id: loans.id,
        contract_number: loans.contract_number,
        client_id: loans.client_id,
        outstanding_balance: loans.outstanding_balance,
        installment_amount: loans.installment_amount,
        due_day: loans.due_day,
        contract_status: loans.contract_status,
        overdue_days: loans.overdue_days,
        interest_rate: loans.interest_rate,
        term_months: loans.term_months,
        contract_start_date: loans.contract_start_date,
        total_penalties: loans.total_penalties,
        client_name: sql<string>`CONCAT(${clients.first_name}, ' ', ${clients.last_name})`,
        client_phone: clients.mobile_number,
      })
      .from(loans)
      .innerJoin(clients, eq(loans.client_id, clients.id))
      .where(
        and(
          sql`${loans.deleted_at} IS NULL`,
          sql`${clients.deleted_at} IS NULL`,
          eq(loans.contract_status, "Overdue"),
          inArray(loans.overdue_days, [1, 3, 7])
        )
      );

    return result.map(row => ({
      ...row,
      contract_start_date: dayjs(row.contract_start_date).toISOString(),
    }));
  }
}

export const loansRepository = new LoansRepository();
