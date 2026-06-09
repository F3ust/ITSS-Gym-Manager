import type { Role } from '../middlewares/auth-middleware'

declare global {
  namespace Express {
    interface Request {
      role?: Role
      userId?: string
    }
  }
}

export {}

