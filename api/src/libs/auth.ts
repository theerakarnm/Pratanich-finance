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
  trustedOrigins: config.cors.origin,
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
      sameSite: config.env === 'production' ? "none" : "lax",
      secure: config.env === 'production', // Secure must be true when SameSite=None

      // HttpOnly flag - prevents JavaScript access to cookies (XSS protection)
      httpOnly: true,

      // Partitioned flag - for CHIPS (Cookies Having Independent Partitioned State)
      // Helps with third-party cookie restrictions in modern browsers
      partitioned: config.env === 'production',

      // Cookie expiration - matches session expiration (7 days)
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds

      // Path - restrict cookie to specific paths if needed
      // Domain - set explicitly in production for subdomain support
      domain: config.auth.cookieDomain,
    },
    useSecureCookies: config.env === 'production', // Use secure cookies in production
  }
});
