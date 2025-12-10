import { describe, it, expect, mock, beforeEach } from "bun:test";
import { LineDomain } from "./line.domain";
import { LineMessagingClient } from "./line.client";
import { LineReplyUtil } from "./utils/line-reply.util";
import { LineEventRouter } from "./line.router";
import { LoansRepository } from "../loans/loans.repository";
import { ClientsRepository } from "../clients/clients.repository";
import { PaymentRepository } from "../payments/payments.repository";
import type { LineMessageEvent, LineTextMessage } from "./line.types";

// Mocks
const mockClient = mock(LineMessagingClient.prototype);
const mockReplyUtil = {
  replyText: mock(async () => { }),
};
const mockEventRouter = mock(LineEventRouter.prototype);

const mockLoansRepo = {
  findByClientId: mock(async () => []),
  findById: mock(async () => null),
};
const mockClientsRepo = {
  findByLineUserId: mock(async () => null),
};
const mockPaymentsRepo = {
  findPaymentHistory: mock(async () => []),
};

describe("LineDomain", () => {
  let lineDomain: LineDomain;

  beforeEach(() => {
    // Reset mocks
    mockReplyUtil.replyText.mockClear();
    mockClientsRepo.findByLineUserId.mockClear();
    mockLoansRepo.findByClientId.mockClear();

    lineDomain = new LineDomain(
      mockClient as any,
      mockReplyUtil as any,
      mockEventRouter as any,
      mockLoansRepo as any,
      mockClientsRepo as any,
      mockPaymentsRepo as any
    );
  });

  describe("handleTextMessage", () => {
    it("should reply with contract info if user sends 'สัญญา' and exists", async () => {
      const event: LineMessageEvent = {
        type: "message",
        message: { type: "text", id: "msg1", text: "ขอดูสัญญาหน่อยครับ" },
        source: { type: "user", userId: "user123" },
        replyToken: "replyToken1",
        timestamp: 1234567890,
        mode: "active",
      };

      // Mock client found
      mockClientsRepo.findByLineUserId.mockResolvedValue({ id: "client1" } as any);
      // Mock loans found
      mockLoansRepo.findByClientId.mockResolvedValue([
        { contract_number: "LOAN-001", contract_status: "Active" },
      ] as any);

      await lineDomain.handleTextMessage(event, "replyToken1");

      expect(mockClientsRepo.findByLineUserId).toHaveBeenCalledWith("user123");
      expect(mockLoansRepo.findByClientId).toHaveBeenCalledWith("client1");
      expect(mockReplyUtil.replyText).toHaveBeenCalled();
      const replyArgs = mockReplyUtil.replyText.mock.calls[0];
      expect(replyArgs[1]).toContain("รายการสัญญาของคุณ");
      expect(replyArgs[1]).toContain("LOAN-001");
    });

    it("should reply with not found if user sends 'สัญญา' but client not found", async () => {
      const event: LineMessageEvent = {
        type: "message",
        message: { type: "text", id: "msg1", text: "สัญญา" },
        source: { type: "user", userId: "unknownUser" },
        replyToken: "replyToken2",
        timestamp: 1234567890,
        mode: "active",
      };

      mockClientsRepo.findByLineUserId.mockResolvedValue(null);

      await lineDomain.handleTextMessage(event, "replyToken2");

      expect(mockClientsRepo.findByLineUserId).toHaveBeenCalledWith("unknownUser");
      expect(mockReplyUtil.replyText).toHaveBeenCalled();
      const replyArgs = mockReplyUtil.replyText.mock.calls[0];
      expect(replyArgs[1]).toContain("ไม่พบข้อมูลของคุณในระบบ");
    });
  });
});
