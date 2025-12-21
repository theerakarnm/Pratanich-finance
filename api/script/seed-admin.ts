import { auth } from "../src/libs/auth";
import { db } from "../src/core/database";
import { eq } from "drizzle-orm";
import { users } from "../src/core/database/schema";

const ADMIN_EMAIL = "admin@smartloan.com";
const ADMIN_PASSWORD = "!SMARTLOAN@2025";
const ADMIN_NAME = "Admin User";

async function seedAdmin() {
  console.log("🌱 Seeding admin account...");

  try {
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, ADMIN_EMAIL),
    });

    let userId: string;

    if (existingUser) {
      console.log("ℹ️ Admin user already exists.");
      userId = existingUser.id;

      // Ensure the existing user has admin role
      if (existingUser.role !== 'admin') {
        console.log("Updating user role to admin...");
        await db.update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, userId));
        console.log("✅ User role updated to admin.");
      }
    } else {
      console.log("Creating admin user...");
      const user = await auth.api.signUpEmail({
        body: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          name: ADMIN_NAME,
        }
      });

      if (!user) {
        throw new Error("Failed to create admin user");
      }

      userId = user.user.id;
      console.log("✅ Admin user created.");

      // Set role to admin after creation
      console.log("Setting admin role...");
      await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, userId));
      console.log("✅ Admin role set.");
    }

    console.log("✨ Admin seeding completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedAdmin();
