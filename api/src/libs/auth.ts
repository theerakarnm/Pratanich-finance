import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { config } from "../core/config";
import { db } from "../core/database";
import * as schema from "../core/database/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema
    },
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin()
  ],
  trustedOrigins: ['http://localhost:5555'],
  secret: config.auth.secret,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: false // Disable for localhost development
    },
    defaultCookieAttributes: {
      sameSite: "lax", // Changed from "none" to "lax" for better compatibility
      secure: process.env.NODE_ENV === "production", // Only secure in production
    }
  }
});
