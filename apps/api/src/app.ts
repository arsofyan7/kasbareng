import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { prisma } from './common/prisma';
import { sendSuccess, sendError } from './common/response';

export const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${_res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  try {
    // Ping PostgreSQL database via Prisma
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
      err instanceof Error ? err.message : String(err)
    );
  }
});

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