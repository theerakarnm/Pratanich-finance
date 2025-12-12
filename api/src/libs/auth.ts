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
  trustedOrigins: ['http://localhost:5555', 'https://pratanich-finance.vercel.app'],
  secret: config.auth.secret,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: false
    },
    defaultCookieAttributes: {
      // Must use "none" for cross-origin authentication (frontend and API on different domains)
      // "lax" only works when frontend and API share the same domain
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production", // Secure must be true when SameSite=None
    }
  }
});
