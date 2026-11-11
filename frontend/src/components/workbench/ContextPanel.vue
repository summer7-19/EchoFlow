<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpenText, MoreHorizontal, Sparkles } from 'lucide-vue-next'
import type { Scene } from '../../composables/useWorkbench'
import type { TranscribeSegment } from '../../api/transcribe'
import type {
  InterviewPayload,
  MedicationPayload,
  MemoPayload,
  QuizPayload,
  SopPayload,
  TranscriptPayload,
} from '../../types/scenes'
import MedicationContext from './context/MedicationContext.vue'
import SopContext from './context/SopContext.vue'
import QuizContext from './context/QuizContext.vue'
import MemoContext from './context/MemoContext.vue'
import InterviewContext from './context/InterviewContext.vue'
import TranscriptContext from './context/TranscriptContext.vue'
import QuizTranscript from './context/QuizTranscript.vue'

const props = defineProps<{
  scene: Scene
  medication?: MedicationPayload | null
  sop?: SopPayload | null
  quiz?: QuizPayload | null
  memo?: MemoPayload | null
  interview?: InterviewPayload | null
  transcriptPayload?: TranscriptPayload | null
  transcript?: TranscribeSegment[]
  checked?: boolean[]
  selected?: string
  questionIndex?: number
  transcribing?: boolean
  transcriptError?: string
}>()

const emit = defineEmits<{
  (event: 'seek', time: number): void
  (event: 'tick'): void
  (event: 'transcribe'): void
}>()

const HEADINGS: Record<Scene, { kicker: string; title: string }> = {
  medication: { kicker: 'MEDICATION PLAN', title: '服药安排' },
  sop: { kicker: 'STEPOVERVIEW', title: '步骤与提醒' },
  quiz: { kicker: 'ANSWER INSIGHT', title: '答案线索' },
  memo: { kicker: 'TOPIC MAP', title: '主题脉络' },
  interview: { kicker: 'INTERVIEW DEBRIEF', title: '面试复盘' },
  transcript: { kicker: 'VERBATIM TRANSCRIPT', title: '原文转写' },
}

const transcriptOpen = ref(false)
const heading = computed(() => HEADINGS[props.scene])

function toggleTranscript() {
  transcriptOpen.value = !transcriptOpen.value
  if (transcriptOpen.value && !props.transcript?.length && !props.transcribing) {
    emit('transcribe')
  }
}
</script>
<template>
  <aside class="side-pane">
    <div class="side-heading">
      <div><span class="tiny-label">{{ heading.kicker }}</span>
        <h3>{{ heading.title }}</h3>
      </div>
      <button v-if="scene === 'quiz'" class="icon-btn transcript-toggle" :class="{ active: transcriptOpen }"
        aria-label="显示听力原文" title="听力原文" @click="toggleTranscript">
        <BookOpenText :size="18" />
      </button>
      <button v-else class="icon-btn">
        <MoreHorizontal :size="18" />
      </button>
    </div>

    <QuizTranscript v-if="scene === 'quiz'" :open="transcriptOpen" :lines="transcript ?? []"
      :transcribing="transcribing" :error="transcriptError" @close="transcriptOpen = false"
      @seek="emit('seek', $event)" />

    <MedicationContext v-if="scene === 'medication' && medication" :payload="medication"
      :transcript="transcript ?? []" @seek="emit('seek', $event)" />
    <SopContext v-else-if="scene === 'sop' && sop" :payload="sop" :checked="checked ?? []" @tick="emit('tick')" />
    <QuizContext v-else-if="scene === 'quiz' && quiz" :payload="quiz" :selected="selected ?? ''"
      :question-index="questionIndex ?? 0" :transcript="transcript ?? []" @seek="emit('seek', $event)" />
    <MemoContext v-else-if="scene === 'memo' && memo" :payload="memo" />
    <InterviewContext v-else-if="scene === 'interview' && interview" :payload="interview"
      :transcript="transcript ?? []" @seek="emit('seek', $event)" />
    <TranscriptContext v-else-if="scene === 'transcript'" :payload="transcriptPayload"
      :lines="transcript ?? []" />
    <p v-else class="side-empty">该录音暂无此场景的解析结果。</p>

    <div class="side-footer"><span>
        <Sparkles :size="13" /> Echo AI 整理
      </span><button>反馈结果</button></div>
  </aside>
</template>
<style>
.side-pane {
    padding: 20px 19px 14px;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.side-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.side-heading h3 {
    font-size: 17px;
    margin: 4px 0 0;
    font-weight: 600;
}

.side-pane .tiny-label {
    font-size: 12px;
    letter-spacing: 1.05px;
}

.side-empty {
    margin-top: 20px;
    padding: 16px;
    border: 1px dashed #e3eae3;
    border-radius: 8px;
    color: #99a39c;
    font-size: 12px;
    text-align: center;
}

.transcript-toggle.active {
    background: #edf6ef;
    color: #397e5b;
}

.side-footer {
    margin-top: auto;
    padding-top: 13px;
    border-top: 1px solid #edf0ed;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #a2aca5;
    font-size: 10px;
}

.side-footer span {
    display: flex;
    gap: 5px;
    align-items: center;
}

.side-footer span svg {
    color: #81aa84;
}

.side-footer button {
    color: #849188;
    font-size: 10px;
}

@media(max-width:720px) {
    .side-pane {
        min-height: 400px;
        padding: 17px 15px;
    }
}
</style>
