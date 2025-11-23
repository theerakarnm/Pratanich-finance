import { config } from "../../core/config";
import { connectRepository } from "./connect.repository";
import { rateLimitRepository } from "./rate-limit.repository";
import { clientsRepository } from "../clients/clients.repository";
import { generateConnectCode, calculateExpirationDate } from "./connect.utils";
import {
  ConnectCodeNotFoundError,
  ConnectCodeExpiredError,
  ConnectCodeAlreadyUsedError,
  LineUserIdAlreadyConnectedError,
  RateLimitExceededError,
} from "./connect.errors";
import type { LineProfile, VerificationResult } from "./connect.types";

export class ConnectDomain {
  /**
   * Generate a new connect code for a client
   */
  async generateConnectCode(clientId: string) {
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
          code,
          client_id: clientId,
          expires_at: expiresAt,
          is_used: false,
        });

        return connectCode;
      }

      attempts++;
    }

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
    // Verify code first
    const verification = await this.verifyConnectCode(code);
    
    if (!verification.valid) {
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
      throw new RateLimitExceededError(retryAfter);
    }

    // Check if we need to reset the window
    const windowStart = new Date(rateLimit.window_start);
    const windowEnd = new Date(windowStart.getTime() + config.connect.rateLimitWindowMinutes * 60 * 1000);

    if (now > windowEnd) {
      // Window has expired, reset the counter
      await rateLimitRepository.reset(clientId);
      return true;
    }

    // Check if attempts exceed the limit
    if (rateLimit.attempt_count >= config.connect.rateLimitMaxAttempts) {
      // Block the client
      await rateLimitRepository.blockClient(clientId, config.connect.rateLimitBlockMinutes);
      const retryAfter = config.connect.rateLimitBlockMinutes * 60;
      throw new RateLimitExceededError(retryAfter);
    }

    return true;
  }

  /**
   * Increment rate limit counter for a client
   */
  async incrementRateLimit(clientId: string): Promise<void> {
    await rateLimitRepository.incrementAttempts(clientId);
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
}

export const connectDomain = new ConnectDomain();
