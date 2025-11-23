import { Hono } from 'hono';
import usersRoutes from './users.routes';
import { cors } from 'hono/cors';
import { auth } from '../libs/auth';

const router = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
}>();

router.use(
  "/auth/*", // or replace with "*" to enable cors for all routes
  cors({
    origin: "http://localhost:5555", // replace with your origin
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
)

// Auth routes
router.on(['POST', 'GET'], '/auth/*', (c) => auth.handler(c.req.raw));

import clientsRoutes from './clients.routes';
import loansRoutes from './loans.routes';
import lineRoutes from './line.routes';
import connectRoutes from './connect.routes';
import slipokRoutes from '../features/slipok/slipok.routes';

// Feature routes
router.route('/users', usersRoutes);
router.route('/internal/clients', clientsRoutes);
router.route('/internal/loans', loansRoutes);
router.route('/line', lineRoutes);
router.route('/internal', connectRoutes);
router.route('/slipok', slipokRoutes);

export default router;
