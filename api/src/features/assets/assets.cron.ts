
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import logger from '../../core/logger';
import dayjs from 'dayjs';

/**
 * Initialize asset cleanup job
 * Clean up files in uploads directory that are older than 3 months
 */
export function initializeAssetCleanupJob(): void {
  // Run every day at 00:00
  cron.schedule('0 0 * * *', async () => {
    logger.info({ event: 'asset_cleanup_started' }, 'Starting asset cleanup job');

    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        logger.info({ event: 'asset_cleanup_skipped' }, 'Uploads directory does not exist');
        return;
      }

      const thresholdDate = dayjs().subtract(3, 'month');
      let cleanedCount = 0;

      // Recursive function to traverse directories
      const cleanDirectory = (dir: string) => {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            cleanDirectory(filePath);
            // Optionally remove empty directories
            if (fs.readdirSync(filePath).length === 0) {
              fs.rmdirSync(filePath);
            }
          } else {
            // Check if file is older than threshold
            // We can check file creation time, or infer from directory structure (uploads/YYYY/MM/DD)
            // Using file stats birthtime or mtime
            if (dayjs(stat.mtime).isBefore(thresholdDate)) {
              fs.unlinkSync(filePath);
              cleanedCount++;
            }
          }
        }
      };

      cleanDirectory(uploadDir);

      logger.info({ event: 'asset_cleanup_completed', cleanedCount }, 'Asset cleanup job completed');

    } catch (error) {
      logger.error({ event: 'asset_cleanup_failed', error }, 'Failed to run asset cleanup job');
    }
  }, {
    timezone: 'Asia/Bangkok'
  });

  logger.info({ event: 'asset_cleanup_initialized', schedule: '0 0 * * *' }, 'Asset cleanup job initialized');
}
