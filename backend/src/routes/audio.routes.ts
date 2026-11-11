import { Router } from 'express'
import multer from 'multer'
import { tmpdir } from 'node:os'
import { config } from '../config/env.js'
import type { Repository } from '../repositories/repository.js'
import { audioController } from '../controllers/audio.controller.js'
import { asyncHandler } from '../utils/async-handler.js'
import { HttpError } from '../utils/http-error.js'

const audioMime = /^(audio\/|video\/mp4$|application\/octet-stream$)/i
const upload = multer({
  dest: tmpdir(),
  limits: { fileSize: config.storage.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    if (audioMime.test(file.mimetype)) done(null, true)
    else done(new HttpError(415, '仅支持音频文件', 'UNSUPPORTED_MEDIA_TYPE'))
  }
})

export function audioRoutes(repository: Repository) {
  const router = Router()
  router.get('/', asyncHandler(audioController.list(repository)))
  router.post('/', upload.single('file'), asyncHandler(audioController.upload(repository)))
  router.get('/:audioId/status', asyncHandler(audioController.status(repository)))
  router.post('/:audioId/reprocess', asyncHandler(audioController.reprocess(repository)))
  router.get('/:audioId/stream', asyncHandler(audioController.stream(repository)))
  router.get('/:audioId', asyncHandler(audioController.get(repository)))
  router.delete('/:audioId', asyncHandler(audioController.remove(repository)))
  return router
}
