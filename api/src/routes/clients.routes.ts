import { Hono } from "hono";
import { clientsDomain } from "../features/clients/clients.domain";
import { authMiddleware } from "../middleware/auth.middleware";
import { auth } from "../libs/auth";
import { ResponseBuilder } from "../core/response";

const clientsRoutes = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
}>();

clientsRoutes.get("/", authMiddleware, async (c) => {
  const page = Number(c.req.query("page") || 1);
  const limit = Number(c.req.query("limit") || 10);
  const search = c.req.query("search");

  const result = await clientsDomain.findAll(page, limit, search);
  return ResponseBuilder.success(c, result);
});

clientsRoutes.get("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  try {
    const client = await clientsDomain.findById(id);
    return ResponseBuilder.success(c, client);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 404);
  }
});

clientsRoutes.post("/", authMiddleware, async (c) => {
  const body = await c.req.json();
  try {
    const client = await clientsDomain.create(body);
    return ResponseBuilder.created(c, client);
  } catch (error: any) {
    // Check for duplicate citizen_id error
    if (error.message?.includes('clients_citizen_id_unique') ||
      error.message?.includes('duplicate key') && error.message?.includes('citizen_id')) {
      return ResponseBuilder.error(c, "เลขบัตรประชาชนนี้มีอยู่ในระบบแล้ว", 400);
    }
    // Check for other constraint violations
    if (error.message?.includes('violates') || error.message?.includes('constraint')) {
      return ResponseBuilder.error(c, "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง", 400);
    }
    // Log the actual error for debugging
    console.error("Client creation error:", error);
    return ResponseBuilder.error(c, "ไม่สามารถสร้างลูกค้าได้ กรุณาลองใหม่อีกครั้ง", 400);
  }
});

clientsRoutes.put("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  try {
    const client = await clientsDomain.update(id, body);
    return ResponseBuilder.success(c, client);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 404);
  }
});

clientsRoutes.delete("/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  try {
    await clientsDomain.delete(id);
    return ResponseBuilder.success(c, { message: "Client deleted successfully" });
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 404);
  }
});

export default clientsRoutes;
