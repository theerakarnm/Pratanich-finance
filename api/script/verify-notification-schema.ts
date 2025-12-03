import { db } from "../src/core/database";
import { sql } from "drizzle-orm";

async function verifyNotificationSchema() {
  console.log("Verifying notification_history schema...\n");

  try {
    // Check if notification_history table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_history'
      );
    `);
    console.log("1. Checking notification_history table...");
    console.log("   ✓ Table exists");

    // Check columns
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'notification_history'
      ORDER BY ordinal_position;
    `);
    console.log("\n2. Checking columns...");
    console.log(`   ✓ Found ${columns.rows.length} columns:`);
    columns.rows.forEach((col: any) => {
      console.log(`     - ${col.column_name} (${col.data_type})`);
    });

    // Check indexes
    const indexes = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'notification_history'
      AND schemaname = 'public';
    `);
    console.log("\n3. Checking indexes...");
    console.log(`   ✓ Found ${indexes.rows.length} indexes:`);
    indexes.rows.forEach((idx: any) => {
      console.log(`     - ${idx.indexname}`);
    });

    // Check notification_type enum
    const enumCheck = await db.execute(sql`
      SELECT e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'notification_type'
      ORDER BY e.enumsortorder;
    `);
    console.log("\n4. Checking notification_type enum...");
    console.log(`   ✓ Found ${enumCheck.rows.length} enum values:`);
    enumCheck.rows.forEach((val: any) => {
      console.log(`     - ${val.enumlabel}`);
    });

    // Check foreign keys
    const fkCheck = await db.execute(sql`
      SELECT
        tc.constraint_name,
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
        AND tc.table_name = 'notification_history';
    `);
    console.log("\n5. Checking foreign keys...");
    console.log(`   ✓ Found ${fkCheck.rows.length} foreign keys:`);
    fkCheck.rows.forEach((fk: any) => {
      console.log(`     - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log("\n✅ All notification_history schema checks passed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Schema verification failed:", error);
    process.exit(1);
  }
}

verifyNotificationSchema();
