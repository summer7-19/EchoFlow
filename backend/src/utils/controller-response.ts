import type { Request, Response } from 'express'

/** Sends the standard success envelope. The status `code` is added by the successCode middleware. */
export function sendSuccess(req: Request, res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data, requestId: req.requestId })
}
