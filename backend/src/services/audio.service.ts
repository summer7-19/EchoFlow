import type { AudioRecord } from '../models/types.js'
import type { Repository } from '../repositories/repository.js'
import { HttpError } from '../utils/http-error.js'

/** Loads an audio record only when it belongs to the given user. */
export async function requireOwnedAudio(
  repository: Repository,
  audioId: string,
  userId: string,
): Promise<AudioRecord> {
  const audio = await repository.getAudio(audioId, userId)
  if (!audio) throw new HttpError(404, '找不到该音频', 'AUDIO_NOT_FOUND')
  return audio
}

/** Strips server-only fields and adds the API stream URL. */
export function toAudioResponse({ filePath: _filePath, ...audio }: AudioRecord) {
  return { ...audio, audioUrl: `/api/audios/${audio.audioId}/stream` }
}
