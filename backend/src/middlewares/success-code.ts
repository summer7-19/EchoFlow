import type { RequestHandler, Response } from 'express'

/** Adds the effective HTTP status code to successful 2xx JSON envelopes. */
export const successCode: RequestHandler = (_req, res, next) => {
  const sendJson = res.json.bind(res)

  res.json = ((body: unknown) => {
    const isSuccess = res.statusCode >= 200 && res.statusCode < 300
    if (!isSuccess || !body || typeof body !== 'object') return sendJson(body)

    const envelope = body as Record<string, unknown>
    if (envelope.success !== true || envelope.code !== undefined) return sendJson(body)

    return sendJson({ ...envelope, code: res.statusCode })
  }) as Response['json']

  next()
}
