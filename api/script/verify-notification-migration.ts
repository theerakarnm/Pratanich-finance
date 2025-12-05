import { db } from "../src/core/database";
import { sql } from "drizzle-orm";
import { logger } from "../src/core/logger";

/**
 * Verify notification_history table and indexes exist
 */
async function verifyNotificationMigration() {
  try {
    logger.info("Starting notification_history migration verification...");

    // Check if notification_type enum exists
    const enumCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'notification_type'
      ) as exists
    `);
    
    const enumExists = enumCheck.rows[0]?.exists;
    logger.info({ enumExists }, "notification_type enum check");

    if (!enumExists) {
      logger.error("notification_type enum does not exist!");
      process.exit(1);
    }

    // Check if notification_history table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_history'
      ) as exists
    `);
    
    const tableExists = tableCheck.rows[0]?.exists;
    logger.info({ tableExists }, "notification_history table check");

    if (!tableExists) {
      logger.error("notification_history table does not exist!");
      process.exit(1);
    }

    // Check table columns
    const columnsCheck = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'notification_history'
      ORDER BY ordinal_position
    `);

    logger.info({ 
      columnCount: columnsCheck.rows.length,
      columns: columnsCheck.rows 
    }, "notification_history columns");

    // Verify required columns exist
    const requiredColumns = [
      'id', 'loan_id', 'client_id', 'line_user_id', 
      'notification_type', 'billing_period', 'overdue_days',
      'sent_at', 'message_data', 'send_status', 'error_message', 'created_at'
    ];

    const actualColumns = columnsCheck.rows.map((row: any) => row.column_name);
    const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));

    if (missingColumns.length > 0) {
      logger.error({ missingColumns }, "Missing required columns!");
      process.exit(1);
    }

    // Check indexes
    const indexesCheck = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
      AND tablename = 'notification_history'
    `);

    logger.info({ 
      indexCount: indexesCheck.rows.length,
      indexes: indexesCheck.rows 
    }, "notification_history indexes");

    // Verify required indexes exist
    const requiredIndexes = [
      'idx_notification_history_loan_type_period',
      'idx_notification_history_sent_at'
    ];

    const actualIndexes = indexesCheck.rows.map((row: any) => row.indexname);
    const missingIndexes = requiredIndexes.filter(idx => !actualIndexes.includes(idx));

    if (missingIndexes.length > 0) {
      logger.error({ missingIndexes }, "Missing required indexes!");
      process.exit(1);
    }

    // Check foreign key constraints
    const fkCheck = await db.execute(sql`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'notification_history'
    `);

    logger.info({ 
      fkCount: fkCheck.rows.length,
      foreignKeys: fkCheck.rows 
    }, "notification_history foreign keys");

    // Verify foreign keys to loans and clients
    const fkNames = fkCheck.rows.map((row: any) => row.foreign_table_name);
    if (!fkNames.includes('loans') || !fkNames.includes('clients')) {
      logger.error({ fkNames }, "Missing required foreign keys!");
      process.exit(1);
    }

    logger.info("✅ All migration verification checks passed!");
    logger.info({
      enum: "notification_type exists",
      table: "notification_history exists",
      columns: `${actualColumns.length} columns present`,
      indexes: `${actualIndexes.length} indexes present`,
      foreignKeys: `${fkCheck.rows.length} foreign keys present`
    }, "Migration verification summary");

    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Migration verification failed");
    process.exit(1);
  }
}

verifyNotificationMigration();
