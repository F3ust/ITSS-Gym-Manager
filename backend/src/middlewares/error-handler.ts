import type { NextFunction, Request, Response } from 'express'

export type ApiError = {
  status: number
  code: string
  message: string
  details?: Record<string, unknown>
}

export function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status || 500
  const code = err?.code || 'ERR_INTERNAL'
  const message = err?.message || 'Unexpected error'
  res.status(status).json({ code, message, details: err?.details || {} })
}
