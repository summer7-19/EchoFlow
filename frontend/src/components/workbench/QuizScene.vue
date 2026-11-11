<script setup lang="ts">
import { computed } from 'vue'
import { Check, Volume2 } from 'lucide-vue-next'
import type { QuizPayload } from '../../types/scenes'
import { formatClock } from '../../utils/scenes'

const props = defineProps<{
  payload: QuizPayload
  selected: string
  questionIndex: number
  current: number
}>()
const emit = defineEmits<{
  (event: 'select', answer: string): void
  (event: 'seek', time: number): void
  (event: 'navigate', direction: number): void
}>()

const LETTERS = 'ABCDEF'
const questions = computed(() => props.payload.questions)
const total = computed(() => questions.value.length)
const question = computed(() => questions.value[props.questionIndex])
const options = computed(() => question.value?.options ?? [])
const correctIndex = computed(() => question.value?.answer ?? -1)
const selectedIndex = computed(() => LETTERS.indexOf(props.selected))

const optionLetter = (index: number) => LETTERS[index] ?? String(index + 1)
const isSelected = (index: number) => selectedIndex.value === index
const isCorrect = (index: number) => index === correctIndex.value

function lineActive(start: number, end?: number) {
  return props.current >= start && props.current <= (end ?? start + 30)
}
</script>
<template>
    <div class="scene-content alternative-scene quiz-scene">
        <div class="scene-title-row">
            <div><span class="tiny-label">LISTENING PRACTICE</span>
                <h3>{{ payload.title }}</h3>
                <p>{{ total }} 道题 · {{ payload.transcript.length }} 句中英对照</p>
            </div>
            <div class="question-navigation"><button aria-label="上一题" :disabled="questionIndex === 0"
                    @click="emit('navigate', -1)">‹</button><span class="question-count">{{
                        String(total ? questionIndex + 1 : 0).padStart(2,'0') }} <small>/ {{ String(total).padStart(2, '0') }}</small></span><button aria-label="下一题"
                    :disabled="questionIndex >= total - 1" @click="emit('navigate', 1)">›</button></div>
        </div>
        <div v-if="question" class="question-card"><span class="question-label">COMPREHENSION · 理解题</span>
            <h4>{{ question.question }}</h4><button v-for="(option, i) in options"
                :key="`${i}-${option}`"
                :class="['answer-option', { selected: isSelected(i), correct: isSelected(i) && isCorrect(i) }]"
                @click="emit('select', optionLetter(i))"><span>{{ optionLetter(i) }}</span>{{ option }}
                <Check v-if="isSelected(i) && isCorrect(i)" :size="16" />
            </button>
        </div>
        <p v-else class="quiz-empty">本段音频未提取到练习题。</p>
        <div class="bilingual-heading"><span class="tiny-label">BILINGUAL TRANSCRIPT</span><span class="bilingual-count">{{ payload.transcript.length }} 句</span>
        </div>
        <div v-for="(line, index) in payload.transcript" :key="`${line.start}-${index}`" class="bilingual-line"
            :class="{ active: lineActive(line.start, line.end) }" @click="emit('seek', line.start)">
            <small>{{ formatClock(line.start) }}</small>
            <div><b>{{ line.text }}</b><span>{{ line.translation || '暂无翻译' }}</span></div>
            <Volume2 v-if="lineActive(line.start, line.end)" :size="14" />
        </div>
        <p v-if="!payload.transcript.length" class="quiz-empty">LLM 未返回中英对照内容。</p>
    </div>
</template>
<style>
.question-navigation {
    display: flex;
    align-items: center;
    gap: 8px;
}

.question-navigation>button {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    border: 1px solid #e8eee8;
    color: #5f7665;
    font-size: 22px;
    line-height: 1;
    display: grid;
    place-items: center;
}

.question-navigation>button:hover:not(:disabled) {
    background: #f0f7f1;
    border-color: #cfe2d1;
}

.question-navigation>button:disabled {
    opacity: .35;
    cursor: not-allowed;
}

.question-count {
    font: 700 19px Manrope, sans-serif;
    color: #5b946c;
    background: transparent;
    padding: 0;
}

.question-count small {
    font-size: 13px;
    color: #9ca69f;
}

.question-card {
    margin-top: 22px;
    border: 1px solid #edf0ed;
    border-radius: 9px;
    padding: 22px;
    background: #fbfcfb;
}

.question-label {
    font-size: 12px;
    color: #87a18c;
    letter-spacing: .8px;
}

.question-card h4 {
    font-size: 17px;
    line-height: 1.65;
    margin: 12px 0 17px;
}

.answer-option {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    min-height: 44px;
    padding: 9px 11px;
    border: 1px solid #eef1ee;
    border-radius: 6px;
    margin-top: 6px;
    text-align: left;
    background: #fff;
    font-size: 14px;
    line-height: 1.55;
    color: #707c73;
}

.answer-option>span {
    width: 25px;
    height: 25px;
    flex: 0 0 25px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #f3f5f3;
    font: 12px Manrope, sans-serif;
    color: #87928a;
}

.answer-option svg {
    margin-left: auto;
}

.answer-option.selected {
    border-color: #9ccba7;
    background: #f5faf5;
    color: #4e7959;
}

.answer-option.selected>span {
    background: #dfefe2;
    color: #548b62;
}

.answer-option.correct {
    border-color: #8cc29a;
}

.quiz-empty {
    margin-top: 18px;
    padding: 18px;
    border: 1px dashed #e3eae3;
    border-radius: 8px;
    color: #99a39c;
    font-size: 12px;
    text-align: center;
}

.bilingual-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 17px 0 9px;
}

.bilingual-count {
    font-size: 10px;
    color: #93a096;
}

.bilingual-line {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
    border-radius: 6px;
    color: #66746a;
    cursor: pointer;
}

.bilingual-line.active {
    background: #eff7f0;
}

.bilingual-line>small {
    font: 11px Manrope, sans-serif;
    color: #96a49a;
    margin-top: 2px;
}

.bilingual-line div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
}

.bilingual-line b {
    font-size: 14px;
    font-weight: 500;
}

.bilingual-line span {
    font-size: 12px;
    color: #9aa49d;
}

.bilingual-line svg {
    color: #75a482;
}

@media(max-width:900px) {
    .question-card {
        padding: 18px;
    }
}

@media(max-width:720px) {
    .question-card h4 {
        font-size: 15px;
    }

    .answer-option {
        font-size: 12px;
        min-height: 40px;
    }
}
</style>
