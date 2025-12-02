import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { connectDomain } from "../features/connect/connect.domain";
import { clientsDomain } from "../features/clients/clients.domain";
import { authMiddleware } from "../middleware/auth.middleware";
import { auth } from "../libs/auth";
import { ResponseBuilder } from "../core/response";
import logger from "../core/logger";
import {
  ConnectCodeNotFoundError,
  ConnectCodeExpiredError,
  ConnectCodeAlreadyUsedError,
  LineUserIdAlreadyConnectedError,
  RateLimitExceededError,
  InvalidPhoneOrContractError,
} from "../features/connect/connect.errors";

const connectRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
}>();

// Validation schemas
const verifyCodeSchema = z.object({
  code: z.string().min(1, "Connect code is required"),
});

const completeConnectionSchema = z.object({
  code: z.string().min(1, "Connect code is required"),
  lineUserId: z.string().min(1, "LINE user ID is required"),
  lineDisplayName: z.string().min(1, "LINE display name is required"),
  linePictureUrl: z.string().optional(),
});

const verifyPhoneSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  contractNumber: z.string().min(1, "Contract number is required"),
});

const completePhoneConnectionSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  contractNumber: z.string().min(1, "Contract number is required"),
  lineUserId: z.string().min(1, "LINE user ID is required"),
  lineDisplayName: z.string().min(1, "LINE display name is required"),
  linePictureUrl: z.string().optional(),
});

// Admin endpoint: Generate connect code for a client
connectRoutes.post("/clients/:clientId/connect-code", authMiddleware, async (c) => {
  const clientId = c.req.param("clientId");
  const requestId = c.req.header('x-request-id');
  
  try {
    // Verify client exists
    await clientsDomain.findById(clientId);
    
    // Generate connect code
    const connectCode = await connectDomain.generateConnectCode(clientId);
    
    logger.info({
      event: "admin_connect_code_created",
      clientId,
      code: connectCode.code,
      requestId,
    });
    
    return ResponseBuilder.created(c, {
      code: connectCode.code,
      expiresAt: connectCode.expires_at.toISOString(),
      clientId: connectCode.client_id,
    });
  } catch (error: any) {
    logger.error({
      event: "admin_connect_code_creation_failed",
      clientId,
      error: error.message,
      requestId,
    });

    if (error.message === "Client not found") {
      return ResponseBuilder.error(c, error.message, 404);
    }
    return ResponseBuilder.error(c, error.message, 400);
  }
});

// Admin endpoint: List all connect codes for a client
connectRoutes.get("/clients/:clientId/connect-codes", authMiddleware, async (c) => {
  const clientId = c.req.param("clientId");
  
  try {
    // Verify client exists
    await clientsDomain.findById(clientId);
    
    // Get all connect codes for the client
    const codes = await connectDomain.getConnectCodesByClientId(clientId);
    
    const now = new Date();
    
    // Format codes with status
    const formattedCodes = codes.map(code => ({
      code: code.code,
      isUsed: code.is_used,
      isExpired: code.expires_at < now,
      expiresAt: code.expires_at.toISOString(),
      usedAt: code.used_at ? code.used_at.toISOString() : null,
      createdAt: code.created_at.toISOString(),
    }));
    
    return ResponseBuilder.success(c, { codes: formattedCodes });
  } catch (error: any) {
    if (error.message === "Client not found") {
      return ResponseBuilder.error(c, error.message, 404);
    }
    return ResponseBuilder.error(c, error.message, 400);
  }
});

// Admin endpoint: Delete/invalidate a connect code
connectRoutes.delete("/connect-codes/:code", authMiddleware, async (c) => {
  const code = c.req.param("code");
  
  try {
    // Delete the connect code
    await connectDomain.deleteConnectCode(code);
    
    return ResponseBuilder.success(c, { 
      success: true,
      message: "Connect code deleted successfully"
    });
  } catch (error: any) {
    if (error.message === "Connect code not found") {
      return ResponseBuilder.error(c, error.message, 404);
    }
    return ResponseBuilder.error(c, error.message, 400);
  }
});

// Client-facing endpoint: Verify connect code
connectRoutes.post("/verify", zValidator("json", verifyCodeSchema), async (c) => {
  const { code } = c.req.valid("json");
  const requestId = c.req.header('x-request-id');
  
  try {
    logger.info({
      event: "connect_code_verification_started",
      code,
      requestId,
    });

    // Verify the connect code
    const result = await connectDomain.verifyConnectCode(code);
    
    if (!result.valid) {
      logger.warn({
        event: "connect_code_verification_failed",
        code,
        reason: result.error,
        requestId,
      });

      return ResponseBuilder.error(c, result.error || "Invalid connect code", 400);
    }
    
    // Check rate limit before allowing connection
    try {
      await connectDomain.checkRateLimit(result.clientId!);
    } catch (error: any) {
      if (error instanceof RateLimitExceededError) {
        return ResponseBuilder.error(
          c,
          error.message,
          429,
          "RATE_LIMIT_EXCEEDED",
          { retryAfter: error.retryAfter }
        );
      }
      throw error;
    }
    
    logger.info({
      event: "connect_code_verified",
      code,
      clientId: result.clientId,
      requestId,
    });

    return ResponseBuilder.success(c, {
      valid: true,
      clientId: result.clientId,
    });
  } catch (error: any) {
    logger.error({
      event: "connect_code_verification_error",
      code,
      error: error.message,
      requestId,
    });

    return ResponseBuilder.error(c, error.message, 500);
  }
});

// Client-facing endpoint: Complete connection with LINE profile
connectRoutes.post("/complete", zValidator("json", completeConnectionSchema), async (c) => {
  const { code, lineUserId, lineDisplayName, linePictureUrl } = c.req.valid("json");
  const requestId = c.req.header('x-request-id');
  
  try {
    // Complete the connection
    const client = await connectDomain.completeConnection(code, {
      userId: lineUserId,
      displayName: lineDisplayName,
      pictureUrl: linePictureUrl,
    });
    
    // Get loans summary to check if client has loans
    const loansSummary = await clientsDomain.getLoansSummary(client.id);
    
    logger.info({
      event: "connection_success",
      code,
      clientId: client.id,
      lineUserId,
      hasLoans: loansSummary.totalLoans > 0,
      requestId,
    });

    return ResponseBuilder.success(c, {
      success: true,
      clientId: client.id,
      hasLoans: loansSummary.totalLoans > 0,
    });
  } catch (error: any) {
    // Increment rate limit on failed attempts
    if (error instanceof ConnectCodeNotFoundError ||
        error instanceof ConnectCodeExpiredError ||
        error instanceof ConnectCodeAlreadyUsedError) {
      // Try to get client ID from code for rate limiting
      try {
        const verification = await connectDomain.verifyConnectCode(code);
        if (verification.clientId) {
          await connectDomain.incrementRateLimit(verification.clientId);
        }
      } catch {
        // Ignore errors during rate limit increment
      }
      
      logger.warn({
        event: "connection_failed",
        code,
        lineUserId,
        error: error.message,
        errorType: error.name,
        requestId,
      });

      return ResponseBuilder.error(c, error.message, 400);
    }
    
    if (error instanceof LineUserIdAlreadyConnectedError) {
      logger.warn({
        event: "connection_failed",
        code,
        lineUserId,
        error: error.message,
        errorType: error.name,
        requestId,
      });

      return ResponseBuilder.error(c, error.message, 409);
    }
    
    if (error instanceof RateLimitExceededError) {
      logger.warn({
        event: "connection_failed",
        code,
        lineUserId,
        error: error.message,
        errorType: error.name,
        retryAfter: error.retryAfter,
        requestId,
      });

      return ResponseBuilder.error(
        c,
        error.message,
        429,
        "RATE_LIMIT_EXCEEDED",
        { retryAfter: error.retryAfter }
      );
    }
    
    logger.error({
      event: "connection_error",
      code,
      lineUserId,
      error: error.message,
      requestId,
    });

    return ResponseBuilder.error(c, error.message, 500);
  }
});

// Client-facing endpoint: Get client by LINE user ID
connectRoutes.get("/client/:lineUserId", async (c) => {
  const lineUserId = c.req.param("lineUserId");
  
  try {
    const client = await connectDomain.getClientByLineUserId(lineUserId);
    
    if (!client) {
      return ResponseBuilder.error(c, "Client not found", 404);
    }
    
    return ResponseBuilder.success(c, {
      clientId: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      connectedAt: client.connected_at?.toISOString(),
    });
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 500);
  }
});

// Client-facing endpoint: Get loans summary for a client
connectRoutes.get("/clients/:clientId/loans/summary", async (c) => {
  const clientId = c.req.param("clientId");
  
  try {
    const loansSummary = await clientsDomain.getLoansSummary(clientId);
    
    return ResponseBuilder.success(c, loansSummary);
  } catch (error: any) {
    if (error.message === "Client not found") {
      return ResponseBuilder.error(c, error.message, 404);
    }
    return ResponseBuilder.error(c, error.message, 500);
  }
});

// Client-facing endpoint: Verify phone and contract number
connectRoutes.post("/verify-phone", zValidator("json", verifyPhoneSchema), async (c) => {
  const { phoneNumber, contractNumber } = c.req.valid("json");
  const requestId = c.req.header('x-request-id');
  
  try {
    logger.info({
      event: "phone_contract_verification_started",
      phoneNumber: phoneNumber.slice(-4),
      contractNumber,
      requestId,
    });

    // Verify phone and contract
    const result = await connectDomain.verifyPhoneAndContract(phoneNumber, contractNumber);
    
    if (!result.valid) {
      logger.warn({
        event: "phone_contract_verification_failed",
        phoneNumber: phoneNumber.slice(-4),
        contractNumber,
        reason: result.error,
        requestId,
      });

      return ResponseBuilder.error(c, result.error || "Invalid mobile phone number or contract number", 400);
    }
    
    // Check rate limit before allowing connection
    try {
      await connectDomain.checkRateLimit(result.clientId!);
    } catch (error: any) {
      if (error instanceof RateLimitExceededError) {
        return ResponseBuilder.error(
          c,
          error.message,
          429,
          "RATE_LIMIT_EXCEEDED",
          { retryAfter: error.retryAfter }
        );
      }
      throw error;
    }
    
    logger.info({
      event: "phone_contract_verified",
      phoneNumber: phoneNumber.slice(-4),
      contractNumber,
      clientId: result.clientId,
      requestId,
    });

    return ResponseBuilder.success(c, {
      valid: true,
      clientId: result.clientId,
    });
  } catch (error: any) {
    logger.error({
      event: "phone_contract_verification_error",
      phoneNumber: phoneNumber.slice(-4),
      contractNumber,
      error: error.message,
      requestId,
    });

    return ResponseBuilder.error(c, error.message, 500);
  }
});

// Client-facing endpoint: Complete connection with phone and contract
connectRoutes.post("/complete-phone", zValidator("json", completePhoneConnectionSchema), async (c) => {
  const { phoneNumber, contractNumber, lineUserId, lineDisplayName, linePictureUrl } = c.req.valid("json");
  const requestId = c.req.header('x-request-id');
  
  try {
    // Complete the phone connection
    const client = await connectDomain.completePhoneConnection(phoneNumber, contractNumber, {
      userId: lineUserId,
      displayName: lineDisplayName,
      pictureUrl: linePictureUrl,
    });
    
    // Get loans summary to check if client has loans
    const loansSummary = await clientsDomain.getLoansSummary(client.id);
    
    logger.info({
      event: "phone_connection_success",
      phoneNumber: phoneNumber.slice(-4),
      contractNumber,
      clientId: client.id,
      lineUserId,
      hasLoans: loansSummary.totalLoans > 0,
      requestId,
    });

    return ResponseBuilder.success(c, {
      success: true,
      clientId: client.id,
      hasLoans: loansSummary.totalLoans > 0,
    });
  } catch (error: any) {
    // Increment rate limit on failed attempts
    if (error instanceof InvalidPhoneOrContractError) {
      // Try to get client ID for rate limiting
      try {
        const verification = await connectDomain.verifyPhoneAndContract(phoneNumber, contractNumber);
        if (verification.clientId) {
          await connectDomain.incrementRateLimit(verification.clientId);
        }
      } catch {
        // Ignore errors during rate limit increment
      }
      
      logger.warn({
        event: "phone_connection_failed",
        phoneNumber: phoneNumber.slice(-4),
        contractNumber,
        lineUserId,
        error: error.message,
        errorType: error.name,
        requestId,
      });

      return ResponseBuilder.error(c, error.message, 400);
    }
    
    if (error instanceof LineUserIdAlreadyConnectedError) {
      logger.warn({
        event: "phone_connection_failed",
        phoneNumber: phoneNumber.slice(-4),
        contractNumber,
        lineUserId,
        error: error.message,
        errorType: error.name,
        requestId,
      });

      return ResponseBuilder.error(c, error.message, 409);
    }
    
    if (error instanceof RateLimitExceededError) {
      logger.warn({
        event: "phone_connection_failed",
        phoneNumber: phoneNumber.slice(-4),
        contractNumber,
        lineUserId,
        error: error.message,
        errorType: error.name,
        retryAfter: error.retryAfter,
        requestId,
      });

      return ResponseBuilder.error(
        c,
        error.message,
        429,
        "RATE_LIMIT_EXCEEDED",
        { retryAfter: error.retryAfter }
      );
    }
    
    logger.error({
      event: "phone_connection_error",
      phoneNumber: phoneNumber.slice(-4),
      contractNumber,
      lineUserId,
      error: error.message,
      requestId,
    });

    return ResponseBuilder.error(c, error.message, 500);
  }
});

export default connectRoutes;
