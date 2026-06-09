import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-gym-secret'

export type Role = 'Owner' | 'Staff' | 'PT' | 'Member'

export function requireRole(allowed: Role[]) {
  const lowerAllowed = allowed.map(r => r.toLowerCase())
  return (req: Request, res: Response, next: NextFunction) => {
    let role = ''
    let userId = ''

    const authHeader = req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }
        role = decoded.role
        userId = decoded.userId
      } catch (err) {
        return res.status(401).json({ code: 'ERR_UNAUTHORIZED', message: 'Invalid or expired token' })
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // Fallback for tests/local development without tokens
      role = req.header('x-role') || ''
      userId = req.header('x-user-id') || ''
    }

    const lowerRole = role.toLowerCase() as Lowercase<Role>
    if (!lowerRole || !lowerAllowed.includes(lowerRole)) {
      return res.status(403).json({ code: 'ERR_FORBIDDEN', message: 'Access denied' })
    }

    req.role = role as Role
    req.userId = userId
    return next()
  }
}

