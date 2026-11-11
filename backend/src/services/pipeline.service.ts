import type { Repository } from '../repositories/repository.js'
import type { Segment } from '../models/types.js'
import { parseAudio } from '../agents/parser.js'
import { HttpError } from '../utils/http-error.js'
import { AsrService } from './asr.service.js'

export async function processAudio(repository: Repository, audioId: string) {
  const record = await repository.getAudio(audioId)
  if (!record) throw new HttpError(404, '找不到该音频', 'AUDIO_NOT_FOUND')

  await repository.updateAudio(audioId, { status: 'TRANSCRIBING', error: undefined })

  try {
    let transcript = record.transcript

    if (transcript.length === 0) {
      const asr = await AsrService.transcribeLocalAudio(record.filePath)

      transcript = asr.segments.map<Segment>(segment => ({
        id: String(segment.id),
        start: segment.start,
        end: segment.end,
        text: segment.text,
        ...(segment.speaker === undefined ? {} : { speaker: String(segment.speaker) }),
      }))

      await repository.updateAudio(audioId, { transcript })
    }

    const result = await parseAudio(transcript)

    const updated = await repository.updateAudio(audioId, {
      status: 'PARSED',
      category: result.category,
      transcript: result.transcript,
    })
    if (!updated) throw new HttpError(404, '找不到该音频', 'AUDIO_NOT_FOUND')

    await repository.saveScene({
      audioId,
      category: result.category,
      payload: result.payload,
      updatedAt: new Date().toISOString(),
    })

    return updated
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing failure'
    await repository.updateAudio(audioId, { status: 'FAILED', error: message })
    throw error
  }
}
