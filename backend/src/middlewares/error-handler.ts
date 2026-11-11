import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../utils/http-error.js'

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请求数据无效', details: error.flatten() },
      requestId: req.requestId,
    })
    return
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
      requestId: req.requestId,
    })
    return
  }

  if ((error as NodeJS.ErrnoException).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: '上传文件超过大小限制' },
      requestId: req.requestId,
    })
    return
  }

  console.error(`[${req.requestId}]`, error)
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    requestId: req.requestId,
  })
}
