import { computed, ref, type Ref } from 'vue'
import type { TranscribeSegment } from '../api/transcribe'

export type Scene =
  | 'medication'
  | 'sop'
  | 'quiz'
  | 'memo'
  | 'interview'
  | 'transcript'

export function useWorkbench(transcript: Ref<TranscribeSegment[]>) {
  const scene = ref<Scene>('transcript')
  const playing = ref(false)
  const current = ref(0)
  const checked = ref<boolean[]>([])
  const selected = ref('')

  const activeSegment = computed(() =>
    transcript.value.findIndex(
      segment => current.value >= segment.start && current.value <= segment.end,
    ),
  )

  function togglePlay() {
    playing.value = !playing.value
  }

  function seek(time: number) {
    current.value = time
  }

  function scrub(event: Event) {
    current.value = Number((event.target as HTMLInputElement).value)
  }

  function tick() {
    current.value += 1
  }

  function toggleChecked(index: number) {
    checked.value[index] = !checked.value[index]
  }

  return {
    scene,
    playing,
    current,
    checked,
    selected,
    activeSegment,
    togglePlay,
    seek,
    scrub,
    tick,
    toggleChecked,
  }
}
