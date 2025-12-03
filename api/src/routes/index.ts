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
    origin: ["http://localhost:5555", 'https://d0badd696350.ngrok-free.app'], // replace with your origin
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
import paymentWebhookRoutes from '../features/payments/payment-webhook.routes';
import pendingPaymentsRoutes from './pending-payments.routes';
import paymentsRoutes from './payments.routes';
import receiptsRoutes from './receipts.routes';

// Feature routes
router.route('/users', usersRoutes);
router.route('/internal/clients', clientsRoutes);
router.route('/internal/loans', loansRoutes);
router.route('/line', lineRoutes);
router.route('/internal', connectRoutes); // Admin endpoints: /api/internal/clients/:id/connect-code
router.route('/connect', connectRoutes); // Client-facing endpoints: /api/connect/verify, /api/connect/complete
router.route('/slipok', slipokRoutes);
router.route('/webhooks', paymentWebhookRoutes); // Webhook endpoints: /api/webhooks/slipok
router.route('/admin/pending-payments', pendingPaymentsRoutes); // Admin endpoints: /api/admin/pending-payments
router.route('/payments', paymentsRoutes); // Payment query endpoints: /api/payments/:id, /api/payments/history/:loanId, /api/payments/receipt/:id
router.route('/receipts', receiptsRoutes);


export default router;
