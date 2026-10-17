import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  data: T | null;
  meta: {
    request_id: string;
    timestamp?: string;
    [key: string]: unknown;
  };
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
) {
  const requestId = (res.locals?.requestId as string) || generateRequestId();
  return res.status(statusCode).json({
    data,
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      ...meta,
    },
    error: null,
  });
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details: unknown = {}
) {
  const requestId = (res.locals?.requestId as string) || generateRequestId();
  return res.status(statusCode).json({
    data: null,
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
    error: {
      code,
      message,
      details: details ?? {},
    },
  });
}