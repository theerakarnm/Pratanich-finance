import { config } from "../../core/config";
import { connectRepository } from "./connect.repository";
import { rateLimitRepository } from "./rate-limit.repository";
import { clientsRepository } from "../clients/clients.repository";
import { loansRepository } from "../loans/loans.repository";
import { generateConnectCode, calculateExpirationDate, normalizePhoneNumber } from "./connect.utils";
import {
  ConnectCodeNotFoundError,
  ConnectCodeExpiredError,
  ConnectCodeAlreadyUsedError,
  LineUserIdAlreadyConnectedError,
  RateLimitExceededError,
  InvalidPhoneOrContractError,
} from "./connect.errors";
import type { LineProfile, VerificationResult } from "./connect.types";
import logger from "../../core/logger";

export class ConnectDomain {
  /**
   * Generate a new connect code for a client
   */
  async generateConnectCode(clientId: string) {
    logger.info({
      event: "connect_code_generation_started",
      clientId,
    });

    const maxRetries = 5;
    let attempts = 0;

    while (attempts < maxRetries) {
      const code = generateConnectCode();

      // Check if code already exists
      const existing = await connectRepository.findByCode(code);

      if (!existing) {
        // Code is unique, create it
        const expiresAt = calculateExpirationDate(config.connect.codeExpiryDays);

        const connectCode = await connectRepository.create({
          code: code.replace('-', ''),
          client_id: clientId,
          expires_at: expiresAt,
          is_used: false,
        });

        logger.info({
          event: "connect_code_generated",
          clientId,
          code: connectCode.code,
          expiresAt: connectCode.expires_at.toISOString(),
        });

        return connectCode;
      }

      attempts++;
      logger.warn({
        event: "connect_code_collision",
        clientId,
        attempt: attempts,
      });
    }

    logger.error({
      event: "connect_code_generation_failed",
      clientId,
      reason: "max_retries_exceeded",
    });

    throw new Error("Failed to generate unique connect code after multiple attempts");
  }

  /**
   * Verify connect code validity
   */
  async verifyConnectCode(code: string): Promise<VerificationResult> {
    const connectCode = await connectRepository.findByCode(code);

    if (!connectCode) {
      return {
        valid: false,
        error: "Invalid connect code",
      };
    }

    if (connectCode.is_used) {
      return {
        valid: false,
        error: "Connect code has already been used",
      };
    }

    const now = new Date();
    if (connectCode.expires_at < now) {
      return {
        valid: false,
        error: "Connect code has expired",
      };
    }

    return {
      valid: true,
      clientId: connectCode.client_id,
    };
  }

  /**
   * Complete connection with LINE profile data
   */
  async completeConnection(code: string, lineProfile: LineProfile) {
    logger.info({
      event: "connection_attempt_started",
      code,
      lineUserId: lineProfile.userId,
    });

    // Verify code first
    const verification = await this.verifyConnectCode(code);

    if (!verification.valid) {
      logger.warn({
        event: "connection_attempt_failed",
        code,
        lineUserId: lineProfile.userId,
        reason: verification.error,
      });

      if (verification.error === "Invalid connect code") {
        throw new ConnectCodeNotFoundError();
      } else if (verification.error === "Connect code has expired") {
        throw new ConnectCodeExpiredError();
      } else if (verification.error === "Connect code has already been used") {
        throw new ConnectCodeAlreadyUsedError();
      }
      throw new Error(verification.error);
    }

    const clientId = verification.clientId!;

    // Check if LINE user ID is already connected to another client
    const existingClient = await clientsRepository.findByLineUserId(lineProfile.userId);

    if (existingClient && existingClient.id !== clientId) {
      logger.warn({
        event: "connection_attempt_failed",
        code,
        lineUserId: lineProfile.userId,
        clientId,
        reason: "line_user_id_already_connected",
        existingClientId: existingClient.id,
      });
      throw new LineUserIdAlreadyConnectedError();
    }

    // Update client with LINE profile data
    const updatedClient = await clientsRepository.updateLineProfile(clientId, {
      line_user_id: lineProfile.userId,
      line_display_name: lineProfile.displayName,
      line_picture_url: lineProfile.pictureUrl || null,
      connected_at: new Date(),
    });

    // Mark connect code as used
    await connectRepository.markAsUsed(code);

    logger.info({
      event: "connection_completed",
      code,
      clientId,
      lineUserId: lineProfile.userId,
      lineDisplayName: lineProfile.displayName,
    });

    return updatedClient;
  }

  /**
   * Get client by LINE user ID
   */
  async getClientByLineUserId(lineUserId: string) {
    return await clientsRepository.findByLineUserId(lineUserId);
  }

  /**
   * Check if client is rate limited
   * Returns true if within limit, throws RateLimitExceededError if exceeded
   */
  async checkRateLimit(clientId: string): Promise<boolean> {
    const rateLimit = await rateLimitRepository.getOrCreate(clientId);
    const now = new Date();

    // Check if client is currently blocked
    if (rateLimit.blocked_until && rateLimit.blocked_until > now) {
      const retryAfter = Math.ceil((rateLimit.blocked_until.getTime() - now.getTime()) / 1000);

      logger.warn({
        event: "rate_limit_blocked",
        clientId,
        blockedUntil: rateLimit.blocked_until.toISOString(),
        retryAfter,
      });

      throw new RateLimitExceededError(retryAfter);
    }

    // Check if we need to reset the window
    const windowStart = new Date(rateLimit.window_start);
    const windowEnd = new Date(windowStart.getTime() + config.connect.rateLimitWindowMinutes * 60 * 1000);

    if (now > windowEnd) {
      // Window has expired, reset the counter
      await rateLimitRepository.reset(clientId);

      logger.info({
        event: "rate_limit_reset",
        clientId,
      });

      return true;
    }

    // Check if attempts exceed the limit
    if (rateLimit.attempt_count >= config.connect.rateLimitMaxAttempts) {
      // Block the client
      await rateLimitRepository.blockClient(clientId, config.connect.rateLimitBlockMinutes);
      const retryAfter = config.connect.rateLimitBlockMinutes * 60;

      logger.warn({
        event: "rate_limit_exceeded",
        clientId,
        attemptCount: rateLimit.attempt_count,
        maxAttempts: config.connect.rateLimitMaxAttempts,
        blockDurationMinutes: config.connect.rateLimitBlockMinutes,
        retryAfter,
      });

      throw new RateLimitExceededError(retryAfter);
    }

    return true;
  }

  /**
   * Increment rate limit counter for a client
   */
  async incrementRateLimit(clientId: string): Promise<void> {
    const rateLimit = await rateLimitRepository.incrementAttempts(clientId);

    logger.info({
      event: "rate_limit_incremented",
      clientId,
      attemptCount: rateLimit.attempt_count,
      maxAttempts: config.connect.rateLimitMaxAttempts,
    });
  }

  /**
   * Get all connect codes for a client
   */
  async getConnectCodesByClientId(clientId: string) {
    return await connectRepository.findByClientId(clientId);
  }

  /**
   * Delete a connect code
   */
  async deleteConnectCode(code: string) {
    // Verify code exists
    const connectCode = await connectRepository.findByCode(code);

    if (!connectCode) {
      throw new Error("Connect code not found");
    }

    await connectRepository.delete(code);
  }

  /**
   * Verify phone number and contract number
   */
  async verifyPhoneAndContract(phoneNumber: string, contractNumber: string): Promise<VerificationResult> {
    logger.info({
      event: "phone_contract_verification_started",
      phoneNumber: phoneNumber.slice(-4), // Log only last 4 digits for privacy
      contractNumber,
    });

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
      logger.warn({
        event: "phone_contract_verification_failed",
        reason: "invalid_phone_format",
      });
      return {
        valid: false,
        error: "Invalid mobile phone number or contract number",
      };
    }

    // Find client by normalized phone number
    const client = await clientsRepository.findByNormalizedPhone(normalizedPhone);

    if (!client) {
      logger.warn({
        event: "phone_contract_verification_failed",
        reason: "client_not_found",
        normalizedPhone: normalizedPhone.slice(-4),
      });
      return {
        valid: false,
        error: "Invalid mobile phone number or contract number",
      };
    }

    // Verify client has loan with contract number
    const loan = await loansRepository.findByClientAndContractNumber(client.id, contractNumber);

    if (!loan) {
      logger.warn({
        event: "phone_contract_verification_failed",
        reason: "contract_not_found",
        clientId: client.id,
        contractNumber,
      });
      return {
        valid: false,
        error: "Invalid mobile phone number or contract number",
      };
    }

    logger.info({
      event: "phone_contract_verified",
      clientId: client.id,
      contractNumber,
    });

    return {
      valid: true,
      clientId: client.id,
    };
  }

  /**
   * Complete connection using phone and contract number
   */
  async completePhoneConnection(phoneNumber: string, contractNumber: string, lineProfile: LineProfile) {
    logger.info({
      event: "phone_connection_attempt_started",
      phoneNumber: phoneNumber.slice(-4),
      contractNumber,
      lineUserId: lineProfile.userId,
    });

    // Verify phone and contract first
    const verification = await this.verifyPhoneAndContract(phoneNumber, contractNumber);

    if (!verification.valid) {
      logger.warn({
        event: "phone_connection_attempt_failed",
        phoneNumber: phoneNumber.slice(-4),
        contractNumber,
        lineUserId: lineProfile.userId,
        reason: verification.error,
      });
      throw new InvalidPhoneOrContractError();
    }

    const clientId = verification.clientId!;

    // Check if LINE user ID is already connected to another client
    const existingClient = await clientsRepository.findByLineUserId(lineProfile.userId);

    if (existingClient && existingClient.id !== clientId) {
      logger.warn({
        event: "phone_connection_attempt_failed",
        phoneNumber: phoneNumber.slice(-4),
        contractNumber,
        lineUserId: lineProfile.userId,
        clientId,
        reason: "line_user_id_already_connected",
        existingClientId: existingClient.id,
      });
      throw new LineUserIdAlreadyConnectedError();
    }

    // Update client with LINE profile data
    const updatedClient = await clientsRepository.updateLineProfile(clientId, {
      line_user_id: lineProfile.userId,
      line_display_name: lineProfile.displayName,
      line_picture_url: lineProfile.pictureUrl || null,
      connected_at: new Date(),
    });

    logger.info({
      event: "phone_connection_completed",
      phoneNumber: phoneNumber.slice(-4),
      contractNumber,
      clientId,
      lineUserId: lineProfile.userId,
      lineDisplayName: lineProfile.displayName,
    });

    return updatedClient;
  }
}

export const connectDomain = new ConnectDomain();
