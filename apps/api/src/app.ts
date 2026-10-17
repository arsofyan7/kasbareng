import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './common/prisma';
import { sendSuccess, sendError, generateRequestId } from './common/response';
import { authRouter } from './modules/auth/auth.routes';
import { walletRouter } from './modules/wallets/wallet.routes';
import { transactionRouter } from './modules/transactions/transaction.routes';

export const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID and logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || generateRequestId();
  res.locals.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms (${reqId})`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return sendSuccess(res, {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: 'CONNECTED',
        provider: 'postgresql',
      },
      service: 'kasbareng-api',
      version: '1.0.0',
    });
  } catch (err: unknown) {
    return sendError(
      res,
      'DB_UNAVAILABLE',
      'Database connection failed',
      503,
      { error: err instanceof Error ? err.message : String(err) }
    );
  }
});

// Mount modules
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/wallets', walletRouter);
app.use('/api/v1', transactionRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  return sendError(res, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`, 404);
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return sendError(res, 'INTERNAL_SERVER_ERROR', message, 500);
});