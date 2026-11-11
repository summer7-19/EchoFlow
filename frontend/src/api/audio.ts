import { apiRequest, httpClient } from './client'
import type { AudioRecord } from '../types/audio'

export type { AudioRecord } from '../types/audio'

export const listAudios = () => apiRequest<AudioRecord[]>('/audios')

export const getAudio = (audioId: string) => apiRequest<AudioRecord>(`/audios/${audioId}`)

export async function deleteAudio(audioId: string) {
  await httpClient.delete(`/audios/${encodeURIComponent(audioId)}`)
}

export function uploadAudio(
  file: File,
  onUploadProgress?: (progress: number) => void,
) {
  const form = new FormData()
  form.append('file', file)

  return apiRequest<{ audioId: string; status: AudioRecord['status']; audioUrl: string }>(
    '/audios',
    {
      method: 'POST',
      data: form,
      onUploadProgress: event => {
        if (!event.total || !onUploadProgress) return
        onUploadProgress(Math.round((event.loaded / event.total) * 100))
      },
    },
  )
}

export async function fetchAudioBlob(audioId: string) {
  const response = await httpClient.get<Blob>(`/audios/${encodeURIComponent(audioId)}/stream`, {
    responseType: 'blob',
  })
  return response.data
}
