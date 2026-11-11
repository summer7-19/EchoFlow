import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import type { Repository } from '../repositories/repository.js'
import { transcriptSchema } from '../schemas/audio.schema.js'
import { scenePayloadSchema } from '../schemas/scene.schema.js'
import { requireOwnedAudio } from '../services/audio.service.js'
import { processAudio } from '../services/pipeline.service.js'
import { enqueueAudio } from '../services/queue.service.js'
import { HttpError } from '../utils/http-error.js'
import { currentUserId, routeParam } from '../utils/request-user.js'
import { sendSuccess } from '../utils/controller-response.js'

export const sceneController = {
  get(repository: Repository): RequestHandler {
    return async (req, res) => {
      const audio = await requireOwnedAudio(repository, routeParam(req, 'audioId'), currentUserId(req))
      const scene = await repository.getScene(audio.audioId)
      if (!scene) throw new HttpError(404, '场景解析结果尚不可用', 'SCENE_NOT_FOUND')
      return sendSuccess(req, res, scene)
    }
  },

  save(repository: Repository): RequestHandler {
    return async (req, res) => {
      const input = scenePayloadSchema.parse({ ...req.body, audioId: routeParam(req, 'audioId') })
      await requireOwnedAudio(repository, input.audioId, currentUserId(req))

      const scene = { ...input, updatedAt: new Date().toISOString() }
      await repository.saveScene(scene)

      return sendSuccess(req, res, scene)
    }
  },

  saveTranscript(repository: Repository): RequestHandler {
    return async (req, res) => {
      const userId = currentUserId(req)
      const audio = await requireOwnedAudio(repository, routeParam(req, 'audioId'), userId)

      const transcript = transcriptSchema
        .parse(req.body.segments)
        .map(segment => ({ ...segment, id: segment.id ?? randomUUID() }))

      const updated = await repository.updateAudio(audio.audioId, { transcript }, userId)
      return sendSuccess(req, res, {
        audioId: audio.audioId,
        transcript: updated?.transcript ?? [],
      })
    }
  },

  parse(repository: Repository): RequestHandler {
    return async (req, res) => {
      const userId = currentUserId(req)
      const audio = await requireOwnedAudio(repository, routeParam(req, 'audioId'), userId)

      if (req.query.async === 'true') {
        await repository.updateAudio(audio.audioId, { status: 'UPLOADED' }, userId)
        await enqueueAudio(audio.audioId)
        return sendSuccess(req, res, { audioId: audio.audioId, status: 'UPLOADED' }, 202)
      }

      const result = await processAudio(repository, audio.audioId)
      return sendSuccess(req, res, {
        audioId: result.audioId,
        status: result.status,
        category: result.category,
      })
    }
  },
}
