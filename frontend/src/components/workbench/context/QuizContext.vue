<script setup lang="ts">
import { computed } from 'vue'
import { Check, Volume2 } from 'lucide-vue-next'
import type { QuizPayload } from '../../../types/scenes'
import type { TranscribeSegment } from '../../../api/transcribe'
import { formatClock, segmentStart } from '../../../utils/scenes'

const props = defineProps<{
  payload: QuizPayload
  selected: string
  questionIndex: number
  transcript: TranscribeSegment[]
}>()
const emit = defineEmits<{ (event: 'seek', time: number): void }>()

const LETTERS = 'ABCDEF'
const question = computed(() => props.payload.questions[props.questionIndex])
const selectedIndex = computed(() => LETTERS.indexOf(props.selected))
const hasSelection = computed(() => selectedIndex.value >= 0)
const isCorrect = computed(() => hasSelection.value && selectedIndex.value === question.value?.answer)
const answerText = computed(() => {
  const answer = question.value?.answer
  return answer === undefined ? '' : question.value?.options[answer] ?? ''
})
const clue = computed(() => {
  const segmentId = question.value?.clueSegmentId
  if (!segmentId) return undefined
  return props.transcript.find(segment => segment.id === segmentId)
})

function seekClue() {
  const time = segmentStart(props.transcript, question.value?.clueSegmentId)
  if (time !== undefined) emit('seek', time)
}
</script>
<template>
  <div class="quiz-context">
    <div v-if="!question" class="quiz-context-empty">本段音频没有可用于讲解的题目。</div>
    <template v-else>
      <div class="answer-result" :class="{ wrong: hasSelection && !isCorrect, idle: !hasSelection }">
        <span class="result-check">
          <Check v-if="isCorrect" :size="17" />
          <span v-else>?</span>
        </span>
        <div><b>{{ !hasSelection ? '请选择答案' : isCorrect ? '回答正确' : '回答错误' }}</b><span>题目 {{ questionIndex + 1 }} · 理解题</span></div>
      </div>
      <div class="explanation"><span class="tiny-label">CORRECT ANSWER</span>
        <p>{{ answerText || '未提供标准答案' }}</p>
      </div>
      <div v-if="clue" class="clue-card"><span class="tiny-label">听力线索 <span>{{ formatClock(clue.start) }}</span></span>
        <p>“{{ clue.text }}”</p><button @click="seekClue">
          <Volume2 :size="13" /> 定位线索原声 <span>↗</span>
        </button>
      </div>
    </template>
  </div>
</template>
<style>
.quiz-context-empty {
    margin-top: 18px;
    padding: 16px;
    border: 1px dashed #e3eae3;
    border-radius: 8px;
    color: #99a39c;
    font-size: 12px;
    text-align: center;
}

.answer-result {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 19px;
    padding: 12px;
    background: #f0f8f1;
    border-radius: 8px;
}

.answer-result.idle {
    background: #f6f8f6;
}

.answer-result.wrong {
    background: #fdf3f0;
}

.result-check {
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    color: #fff;
    background: #75b486;
    border-radius: 50%;
    font-size: 12px;
}

.answer-result.idle .result-check {
    background: #b2bdb5;
}

.answer-result.wrong .result-check {
    background: #d18f79;
}

.answer-result>div {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.answer-result>div b {
    font-size: 13px;
    color: #4b815a;
}

.answer-result.wrong>div b {
    color: #b0604b;
}

.answer-result.idle>div b {
    color: #75827a;
}

.answer-result>div span {
    font-size: 11px;
    color: #91a096;
}

.explanation {
    margin-top: 17px;
}

.explanation .tiny-label {
    font-size: 13px;
}

.explanation p {
    font-size: 12px;
    color: #78857b;
    line-height: 1.75;
}

.clue-card {
    padding: 11px;
    background: #f8faf8;
    border: 1px solid #edf1ed;
    border-radius: 7px;
    margin-top: 14px;
}

.clue-card>.tiny-label {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
}

.clue-card>.tiny-label span {
    color: #8aa590;
    letter-spacing: 0;
}

.clue-card p {
    font-size: 12px;
    line-height: 1.7;
    color: #68766c;
}

.clue-card button {
    font-size: 11px;
    color: #669375;
    display: flex;
    gap: 5px;
    align-items: center;
}

.clue-card button span {
    margin-left: auto;
}
</style>
