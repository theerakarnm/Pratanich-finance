import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../../core/database";
import { connectRepository } from "./connect.repository";
import { clientsRepository } from "../clients/clients.repository";
import { clients } from "../../core/database/schema/clients.schema";
import { eq } from "drizzle-orm";

describe("ConnectRepository - findActiveLineUserIdByClientId", () => {
  let testClientId: string;
  const testLineUserId = "U1234567890abcdef";

  beforeAll(async () => {
    // Create a test client with LINE connection
    const testClient = await clientsRepository.create({
      citizen_id: "1234567890123",
      title_name: "นาย",
      first_name: "ทดสอบ",
      last_name: "การเชื่อมต่อ",
      date_of_birth: "1990-01-01",
      mobile_number: "0812345678",
      email: "test@example.com",
    });
    testClientId = testClient.id;

    // Update with LINE profile
    await db
      .update(clients)
      .set({
        line_user_id: testLineUserId,
        line_display_name: "Test User",
        connected_at: new Date(),
      })
      .where(eq(clients.id, testClientId));
  });

  afterAll(async () => {
    // Clean up test data
    if (testClientId) {
      await db.delete(clients).where(eq(clients.id, testClientId));
    }
  });

  it("should return LINE user ID for client with active connection", async () => {
    const lineUserId = await connectRepository.findActiveLineUserIdByClientId(testClientId);
    expect(lineUserId).toBe(testLineUserId);
  });

  it("should return null for non-existent client", async () => {
    const lineUserId = await connectRepository.findActiveLineUserIdByClientId("non-existent-id");
    expect(lineUserId).toBeNull();
  });

  it("should return null for client without LINE connection", async () => {
    // Create client without LINE connection
    const clientWithoutLine = await clientsRepository.create({
      citizen_id: "9876543210987",
      title_name: "นาง",
      first_name: "ไม่มี",
      last_name: "ไลน์",
      date_of_birth: "1995-05-05",
      mobile_number: "0898765432",
    });

    const lineUserId = await connectRepository.findActiveLineUserIdByClientId(clientWithoutLine.id);
    expect(lineUserId).toBeNull();

    // Clean up
    await db.delete(clients).where(eq(clients.id, clientWithoutLine.id));
  });
});
