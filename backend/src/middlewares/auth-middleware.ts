import type { NextFunction, Request, Response } from 'express'

export type Role = 'Owner' | 'Staff' | 'PT' | 'Member'

export function requireRole(allowed: Role[]) {
  const lowerAllowed = allowed.map(r => r.toLowerCase())
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req.header('x-role') || '').toLowerCase() as Lowercase<Role>
    if (!role || !lowerAllowed.includes(role)) {
      return res.status(403).json({ code: 'ERR_FORBIDDEN', message: 'Access denied' })
    }
    req.role = role as Role
    return next()
  }
}
