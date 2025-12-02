import { mkdir } from "fs/promises";
import { join } from "path";
import { config } from "../src/core/config";
import logger from "../src/core/logger";

/**
 * Initialize receipt storage directory structure
 * Creates the base receipts directory if it doesn't exist
 * Subdirectories (year/month) are created automatically when receipts are saved
 */
async function initReceiptStorage() {
  try {
    const storagePath = config.payment.receiptStoragePath;
    
    logger.info({ storagePath }, "Initializing receipt storage directory");

    // Create base directory with recursive option
    await mkdir(storagePath, { recursive: true });

    logger.info({ storagePath }, "Receipt storage directory initialized successfully");
    
    console.log("✅ Receipt storage directory initialized successfully");
    console.log(`   Path: ${storagePath}`);
    console.log("   Note: Year/month subdirectories will be created automatically when receipts are saved");
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Failed to initialize receipt storage directory"
    );
    console.error("❌ Failed to initialize receipt storage directory");
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  initReceiptStorage();
}

export { initReceiptStorage };
