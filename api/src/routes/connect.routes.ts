import { Hono } from "hono";
import { connectDomain } from "../features/connect/connect.domain";
import { clientsDomain } from "../features/clients/clients.domain";
import { authMiddleware } from "../middleware/auth.middleware";
import { auth } from "../libs/auth";
import { ResponseBuilder } from "../core/response";

const connectRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
}>();

// Admin endpoint: Generate connect code for a client
connectRoutes.post("/clients/:clientId/connect-code", authMiddleware, async (c) => {
  const clientId = c.req.param("clientId");
  
  try {
    // Verify client exists
    await clientsDomain.findById(clientId);
    
    // Generate connect code
    const connectCode = await connectDomain.generateConnectCode(clientId);
    
    return ResponseBuilder.created(c, {
      code: connectCode.code,
      expiresAt: connectCode.expires_at.toISOString(),
      clientId: connectCode.client_id,
    });
  } catch (error: any) {
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

export default connectRoutes;
