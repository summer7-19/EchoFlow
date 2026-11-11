import type { RequestHandler } from 'express'
import { verifyAccessToken } from '../services/auth.service.js'

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string }
    }
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  const authorization = req.get('authorization')
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)

  if (!match) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未授权访问' },
      requestId: req.requestId,
    })
    return
  }

  try {
    const claims = verifyAccessToken(match[1]!)
    req.user = { id: claims.userId, email: claims.email }
    next()
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '访问令牌无效或已过期' },
      requestId: req.requestId,
    })
  }
}
