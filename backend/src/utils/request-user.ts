import type { Request } from 'express'
import { HttpError } from './http-error.js'

/** The `authenticate` middleware stores the signed-in user on the request. */
export function currentUserId(req: Request): string {
  if (!req.user) throw new HttpError(401, '未授权访问', 'UNAUTHORIZED')
  return req.user.id
}

/** Express may type wildcard parameters as arrays; this normalises them. */
export function routeParam(req: Request, name: string): string {
  const value = req.params[name]
  return Array.isArray(value) ? value[0] ?? '' : value
}
