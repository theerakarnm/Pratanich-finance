
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dayjs from 'dayjs';
import logger from '../core/logger'; // Assumed logger location

const assetsRoutes = new Hono();

// Schema for validation
const querySchema = z.object({
  data: z.string().min(1),
  timestamp: z.string().regex(/^\d+$/, "Timestamp must be numeric").optional(),
});

assetsRoutes.get(
  '/prompt_pay_qr',
  zValidator('query', querySchema),
  async (c) => {
    const { data, timestamp } = c.req.valid('query');

    // Use provided timestamp or current time
    const ts = timestamp ? parseInt(timestamp) : Math.floor(Date.now() / 1000);
    const date = dayjs.unix(ts);

    const year = date.format('YYYY');
    const month = date.format('MM');
    const day = date.format('DD');

    // Create directory structure: uploads/{year}/{month}/{day}
    const uploadDir = path.join(process.cwd(), 'uploads', 'prompt_pay_qr', year, month, day);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate filename using timestamp and hash of data to ensure uniqueness for same data
    const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
    const fileName = `${ts}-${hash}.png`;
    const filePath = path.join(uploadDir, fileName);

    try {
      // Check if file already exists
      if (!fs.existsSync(filePath)) {
        await QRCode.toFile(filePath, data, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        logger.info({ event: 'qr_generated', filePath }, 'Generated new QR code image');
      } else {
        logger.debug({ event: 'qr_cached', filePath }, 'Serving cached QR code image');
      }

      // Read the file and return it
      const fileBuffer = fs.readFileSync(filePath);
      return c.body(fileBuffer, 200, {
        'Content-Type': 'image/png',
        // Optional: Cache control headers
        // 'Cache-Control': 'public, max-age=31536000', 
      });

    } catch (error) {
      logger.error({ event: 'qr_generation_failed', error }, 'Failed to generate QR code');
      return c.json({ error: 'Failed to generate QR code' }, 500);
    }
  }
);

export default assetsRoutes;
