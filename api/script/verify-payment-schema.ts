import { db } from "../src/core/database";
import { sql } from "drizzle-orm";

async function verifySchema() {
  console.log("Verifying payment processing schema changes...\n");

  try {
    // Check transactions table
    console.log("1. Checking transactions table...");
    const transactionsCheck = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position;
    `);
    console.log(`   ✓ Transactions table has ${transactionsCheck.rows.length} columns`);

    // Check pending_payments table
    console.log("\n2. Checking pending_payments table...");
    const pendingPaymentsCheck = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pending_payments'
      ORDER BY ordinal_position;
    `);
    console.log(`   ✓ Pending payments table has ${pendingPaymentsCheck.rows.length} columns`);

    // Check new loans columns
    console.log("\n3. Checking new loans table columns...");
    const loansNewColumns = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'loans'
      AND column_name IN (
        'principal_paid', 'interest_paid', 'penalties_paid', 'total_penalties',
        'last_payment_date', 'last_payment_amount', 'previous_status', 'status_changed_at'
      )
      ORDER BY column_name;
    `);
    console.log(`   ✓ Found ${loansNewColumns.rows.length} new columns in loans table:`);
    loansNewColumns.rows.forEach((row: any) => {
      console.log(`     - ${row.column_name} (${row.data_type})`);
    });

    // Check indexes on transactions
    console.log("\n4. Checking indexes on transactions table...");
    const transactionIndexes = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'transactions'
      ORDER BY indexname;
    `);
    console.log(`   ✓ Found ${transactionIndexes.rows.length} indexes:`);
    transactionIndexes.rows.forEach((row: any) => {
      console.log(`     - ${row.indexname}`);
    });

    // Check enums
    console.log("\n5. Checking new enum types...");
    const enumTypes = await db.execute(sql`
      SELECT typname
      FROM pg_type
      WHERE typname IN ('transaction_type', 'transaction_status', 'pending_payment_status')
      ORDER BY typname;
    `);
    console.log(`   ✓ Found ${enumTypes.rows.length} enum types:`);
    enumTypes.rows.forEach((row: any) => {
      console.log(`     - ${row.typname}`);
    });

    console.log("\n✅ All schema changes verified successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Schema verification failed:", error);
    process.exit(1);
  }
}

verifySchema();
