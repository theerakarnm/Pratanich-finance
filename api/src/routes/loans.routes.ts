import { Hono } from "hono";
import { loansDomain } from "../features/loans/loans.domain";
import { authMiddleware } from "../middleware/auth.middleware";
import { auth } from "../libs/auth";
import { ResponseBuilder } from "../core/response";

const loansRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
}>();

loansRoutes.get("/", authMiddleware, async (c) => {
  const page = Number(c.req.query("page") || 1);
  const limit = Number(c.req.query("limit") || 10);
  const search = c.req.query("search");

  const result = await loansDomain.findAll(page, limit, search);
  return ResponseBuilder.success(c, result);
});

loansRoutes.get("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  try {
    const loan = await loansDomain.findById(id);
    return ResponseBuilder.success(c, loan);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 404);
  }
});

loansRoutes.get("/:id/schedule", authMiddleware, async (c) => {
  const id = c.req.param("id");
  try {
    const schedule = await loansDomain.calculatePaymentSchedule(id);
    return ResponseBuilder.success(c, schedule);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 404);
  }
});

loansRoutes.post("/", authMiddleware, async (c) => {
  const body = await c.req.json();
  try {
    const loan = await loansDomain.create(body);
    return ResponseBuilder.created(c, loan);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 400);
  }
});

loansRoutes.put("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  try {
    const loan = await loansDomain.update(id, body);
    return ResponseBuilder.success(c, loan);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 404);
  }
});

loansRoutes.delete("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  try {
    await loansDomain.delete(id);
    return ResponseBuilder.success(c, { message: "Loan contract deleted successfully" });
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 404);
  }
});

loansRoutes.patch("/:id/collection-fee", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  try {
    if (typeof body.amount !== 'number' || body.amount < 0) {
      return ResponseBuilder.error(c, "Invalid collection fee amount", 400);
    }

    const loan = await loansDomain.updateCollectionFee(id, body.amount);
    return ResponseBuilder.success(c, loan);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 404);
  }
});

loansRoutes.post("/:id/send-message", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  try {
    if (!body.messageType) {
      return ResponseBuilder.error(c, "messageType is required", 400);
    }

    const result = await loansDomain.sendFlexMessage(id, body.messageType);
    return ResponseBuilder.success(c, result);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 400);
  }
});

export default loansRoutes;

