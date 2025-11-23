import { auth } from "../src/libs/auth";
import { db } from "../src/core/database";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

const ADMIN_EMAIL = "admin@ekoe.com";
const ADMIN_PASSWORD = "password123";
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
    }

    console.log("✨ Admin seeding completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedAdmin();
