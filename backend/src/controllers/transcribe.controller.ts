import type { RequestHandler } from 'express'
import type { Repository } from '../repositories/repository.js'
import { transcribeSchema } from '../schemas/transcribe.schema.js'
import { requireOwnedAudio } from '../services/audio.service.js'
import { AsrService, type TranscriptSegment } from '../services/asr.service.js'
import { currentUserId } from '../utils/request-user.js'
import { sendSuccess } from '../utils/controller-response.js'

function toTranscriptSegments(segments: TranscriptSegment[]) {
  return segments.map(segment => ({
    id: String(segment.id),
    start: segment.start,
    end: segment.end,
    text: segment.text,
    ...(segment.speaker === undefined ? {} : { speaker: String(segment.speaker) }),
  }))
}

export const transcribeController = {
  transcribe: (repository: Repository): RequestHandler => async (req, res) => {
    const { audioId, language } = transcribeSchema.parse(req.body)
    const userId = currentUserId(req)
    const record = await requireOwnedAudio(repository, audioId, userId)

    await repository.updateAudio(audioId, { status: 'TRANSCRIBING', error: undefined }, userId)

    try {
      const result = await AsrService.transcribeLocalAudio(record.filePath, language)
      const segments = toTranscriptSegments(result.segments)

      await repository.updateAudio(audioId, { status: 'PARSED', transcript: segments, error: undefined }, userId)

      return sendSuccess(req, res, {
        audioId,
        fullText: result.fullText,
        segments,
        processTime: result.processTime,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '语音转写失败'
      await repository.updateAudio(audioId, { status: 'FAILED', error: message }, userId)
      throw error
    }
  },
}
