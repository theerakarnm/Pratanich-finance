import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1, 'LINE_CHANNEL_ACCESS_TOKEN is required'),
  LINE_CHANNEL_SECRET: z.string().min(1, 'LINE_CHANNEL_SECRET is required'),
  SLIPOK_BRANCH_ID: z.string().optional().default(''),
  SLIPOK_API_KEY: z.string().optional().default(''),
  CONNECT_CODE_EXPIRY_DAYS: z.string().default('7').transform(Number).pipe(z.number().positive()),
  CONNECT_RATE_LIMIT_MAX_ATTEMPTS: z.string().default('5').transform(Number).pipe(z.number().positive()),
  CONNECT_RATE_LIMIT_WINDOW_MINUTES: z.string().default('15').transform(Number).pipe(z.number().positive()),
  CONNECT_RATE_LIMIT_BLOCK_MINUTES: z.string().default('15').transform(Number).pipe(z.number().positive()),
  RECEIPT_STORAGE_PATH: z.string().default('/uploads/receipts'),
  PAYMENT_LOCK_TIMEOUT_MS: z.string().default('5000').transform(Number).pipe(z.number().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

const env = parseEnv();

export const config = {
  port: env.PORT,
  database: {
    url: env.DATABASE_URL,
  },
  auth: {
    secret: env.BETTER_AUTH_SECRET,
  },
  line: {
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: env.LINE_CHANNEL_SECRET,
    messagingApiUrl: 'https://api.line.me/v2/bot',
  },
  slipok: {
    branchId: env.SLIPOK_BRANCH_ID,
    apiKey: env.SLIPOK_API_KEY,
    apiUrl: 'https://api.slipok.com/api/line/apikey',
  },
  connect: {
    codeExpiryDays: env.CONNECT_CODE_EXPIRY_DAYS,
    rateLimitMaxAttempts: env.CONNECT_RATE_LIMIT_MAX_ATTEMPTS,
    rateLimitWindowMinutes: env.CONNECT_RATE_LIMIT_WINDOW_MINUTES,
    rateLimitBlockMinutes: env.CONNECT_RATE_LIMIT_BLOCK_MINUTES,
  },
  payment: {
    receiptStoragePath: env.RECEIPT_STORAGE_PATH,
    lockTimeoutMs: env.PAYMENT_LOCK_TIMEOUT_MS,
  },
  env: env.NODE_ENV,
};
