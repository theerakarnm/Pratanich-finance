import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../../core/database";
import { connectRepository } from "./connect.repository";
import { clientsRepository } from "../clients/clients.repository";
import { clients } from "../../core/database/schema/clients.schema";
import { eq } from "drizzle-orm";

describe("ConnectRepository - findActiveLineUserIdByClientId", () => {
  let testClientId: string;
  let testLineUserId: string;
  // Generate a unique 13-digit citizen ID for testing
  const uniqueCitizenId = `9${Date.now().toString().slice(-12)}`;

  beforeAll(async () => {
    // Generate unique LINE user ID
    testLineUserId = `U${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
    
    // Create a test client with LINE connection
    const testClient = await clientsRepository.create({
      citizen_id: uniqueCitizenId,
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
    const uniqueCitizenId2 = `8${Date.now().toString().slice(-12)}`;
    const clientWithoutLine = await clientsRepository.create({
      citizen_id: uniqueCitizenId2,
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
