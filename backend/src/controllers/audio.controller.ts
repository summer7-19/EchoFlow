import { unlink } from 'node:fs/promises'
import type { RequestHandler } from 'express'
import type { Repository } from '../repositories/repository.js'
import type { AudioRecord } from '../models/types.js'
import { requireOwnedAudio, toAudioResponse } from '../services/audio.service.js'
import { persistUpload, removeStoredFile } from '../services/storage.service.js'
import { enqueueAudio } from '../services/queue.service.js'
import { HttpError } from '../utils/http-error.js'
import { currentUserId, routeParam } from '../utils/request-user.js'
import { sendSuccess } from '../utils/controller-response.js'

function uploadResponse(record: AudioRecord) {
  return {
    audioId: record.audioId,
    status: record.status,
    audioUrl: `/api/audios/${record.audioId}/stream`,
  }
}

export const audioController = {
  list: (repository: Repository): RequestHandler => async (req, res) => {
    const audios = await repository.listAudios(currentUserId(req))
    return sendSuccess(req, res, audios.map(toAudioResponse))
  },

  upload: (repository: Repository): RequestHandler => async (req, res) => {
    if (!req.file) throw new HttpError(400, '缺少音频文件', 'FILE_REQUIRED')

    const originalName = req.file.originalname.normalize('NFC').slice(0, 128)
    let stored: { audioId: string; filePath: string }

    try {
      stored = await persistUpload(req.file.path, originalName)
    } finally {
      await unlink(req.file.path).catch(() => undefined)
    }

    const record: AudioRecord = {
      ...stored,
      userId: currentUserId(req),
      originalName,
      mimeType: req.file.mimetype,
      duration: null,
      fileSize: req.file.size,
      status: 'UPLOADED',
      category: null,
      transcript: [],
      createdAt: new Date().toISOString(),
    }

    await repository.saveAudio(record)
    await enqueueAudio(record.audioId)

    return sendSuccess(req, res, uploadResponse(record), 202)
  },

  get: (repository: Repository): RequestHandler => async (req, res) => {
    const record = await requireOwnedAudio(repository, routeParam(req, 'audioId'), currentUserId(req))
    return sendSuccess(req, res, toAudioResponse(record))
  },

  remove: (repository: Repository): RequestHandler => async (req, res) => {
    const userId = currentUserId(req)
    const record = await requireOwnedAudio(repository, routeParam(req, 'audioId'), userId)

    const removed = await repository.deleteAudio(record.audioId, userId)
    if (!removed) throw new HttpError(404, '找不到该音频', 'AUDIO_NOT_FOUND')

    await removeStoredFile(record.filePath)
    res.status(204).end()
  },

  reprocess: (repository: Repository): RequestHandler => async (req, res) => {
    const userId = currentUserId(req)
    const record = await requireOwnedAudio(repository, routeParam(req, 'audioId'), userId)

    await repository.updateAudio(record.audioId, { status: 'UPLOADED', error: undefined }, userId)
    await enqueueAudio(record.audioId)

    return sendSuccess(req, res, { audioId: record.audioId, status: 'UPLOADED' }, 202)
  },

  stream: (repository: Repository): RequestHandler => async (req, res) => {
    const record = await requireOwnedAudio(repository, routeParam(req, 'audioId'), currentUserId(req))

    // Express's sendFile handles Content-Type, Range requests and 416 responses.
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate')
    res.sendFile(record.filePath, { cacheControl: false })
  },

  status: (repository: Repository): RequestHandler => async (req, res) => {
    const record = await requireOwnedAudio(repository, routeParam(req, 'audioId'), currentUserId(req))
    return sendSuccess(req, res, {
      audioId: record.audioId,
      status: record.status,
      error: record.error,
    })
  },
}
