import { Hono } from 'hono';
import { SlipOKService } from './slipok.service';
import { ResponseBuilder } from '../../core/response';

const slipokRoutes = new Hono();

slipokRoutes.post('/verify', async (c) => {
  try {
    const body = await c.req.json();
    const result = await SlipOKService.verifySlip(body) as any;
    return ResponseBuilder.success(c, result.data);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 400);
  }
});

slipokRoutes.get('/quota', async (c) => {
  try {
    const result = await SlipOKService.getQuota() as any;
    return ResponseBuilder.success(c, result.data);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 400);
  }
});

slipokRoutes.get('/logs', async (c) => {
  try {
    const { page, limit, search } = c.req.query();
    const result = await SlipOKService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
    return ResponseBuilder.success(c, result);
  } catch (error: any) {
    return ResponseBuilder.error(c, error.message, 400);
  }
});

export default slipokRoutes;

