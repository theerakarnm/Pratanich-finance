export const config = {
  port: Number(process.env.PORT) || 3000,
  database: {
    url: process.env.DATABASE_URL || '',
  },
  auth: {
    secret: process.env.BETTER_AUTH_SECRET || 'default-secret',
  },
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
    messagingApiUrl: 'https://api.line.me/v2/bot',
  },
  env: process.env.NODE_ENV || 'development',
};
