import type { AudioCategory } from '../types/audio'
import type { TranscribeSegment } from '../api/transcribe'
import type { Scene } from '../composables/useWorkbench'

const SCENE_BY_CATEGORY: Record<AudioCategory, Scene> = {
  MEDICATION: 'medication',
  SOP: 'sop',
  QUIZ: 'quiz',
  MEMO: 'memo',
  INTERVIEW: 'interview',
  TRANSCRIPT: 'transcript',
}

const CATEGORY_BY_SCENE: Record<Scene, AudioCategory> = {
  medication: 'MEDICATION',
  sop: 'SOP',
  quiz: 'QUIZ',
  memo: 'MEMO',
  interview: 'INTERVIEW',
  transcript: 'TRANSCRIPT',
}

export const KIND_BY_SCENE: Record<Scene, string> = {
  medication: '健康日程',
  sop: '流程规程',
  quiz: '语言精听',
  memo: '知识纪要',
  interview: '面试复盘',
  transcript: '原文转写',
}

/** Maps a backend category to its workbench scene, defaulting to plain transcription. */
export function sceneForCategory(category: AudioCategory | null): Scene {
  return category ? SCENE_BY_CATEGORY[category] : 'transcript'
}

export function categoryForScene(scene: Scene): AudioCategory {
  return CATEGORY_BY_SCENE[scene]
}

/** Resolves the audio position of a scene segment reference. */
export function segmentStart(
  transcript: ReadonlyArray<Pick<TranscribeSegment, 'id' | 'start'>>,
  segmentId?: string,
): number | undefined {
  if (!segmentId) return undefined
  return transcript.find(segment => segment.id === segmentId)?.start
}

/** Formats seconds as mm:ss. */
export function formatClock(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
